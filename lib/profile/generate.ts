import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, VOICE_MODEL, SOLO_MODEL } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildEvidencePack, type ClaimRow } from '@/lib/profile/evidence-pack';
import { ground } from '@/lib/profile/grounding';

// The self-revision pipeline (Screen-13 handoff §3). Per completed run, in order:
//   1. score (already done — the evidence pack carries the markers)
//   2. ADVERSARIAL AUDIT — a SEPARATE model call that tries to DISCONFIRM each prior claim.
//      Kept separate on purpose: fold "try to disconfirm" into generation and the model
//      confirms, because it would be writing the findings and grading them in one breath.
//   3. deterministic audit rules (code, not a model) — esp. no invariant without a failed rep.
//   4. GENERATION — writes new falsifiable findings (every claim carries a falsifier).
//   5. grounding gate on every generated string; repair once, else drop the claim.
//   6. persist grades + new claims; write the profile snapshot.

const INVARIANT = /\b(invariant|unchangeable|fixed|permanent|can'?t change|won'?t change|stop coaching|never move|will not move|immutable)\b/i;

function parseJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

interface Grade { id: string; grade: 'held' | 'sharpened' | 'overturned' | 'untested'; looked_for?: string; found?: boolean; evidence?: string[]; narrower?: { text: string; falsifier: string } }
interface Finding { text: string; falsifier: string; marker?: string | null }

/** Generate (or return the cached) Leadership Profile for a subject's latest completed run. */
export async function generateProfile(subjectId: string): Promise<{ ok: boolean; runNo?: number; reason?: string }> {
  let key: string;
  try { key = anthropicApiKey(); } catch { return { ok: false, reason: 'no_api_key' }; }

  const pack = await buildEvidencePack(subjectId);
  if (!pack) return { ok: false, reason: 'no_runs' };
  const db = createAdminClient();

  // idempotent — one profile per completed-run count
  const { data: existing } = await db.from('leadership_profiles').select('id').eq('subject_id', subjectId).eq('run_no', pack.runNo).maybeSingle<any>();
  if (existing) return { ok: true, runNo: pack.runNo };

  const client = new Anthropic({ apiKey: key });
  const condition = pack.latestCondition ?? 'this run';

  // ---- 2. adversarial audit (Haiku) — only if there are prior claims to grade -------------
  let grades: Grade[] = [];
  if (pack.claims.length) {
    const auditSystem =
      `You are an ADVERSARIAL AUDITOR of a leadership claim ledger. For EACH prior claim, actively search the RECORD (especially the latest run) for evidence that would SATISFY its FALSIFIER — i.e. prove the claim WRONG. You are scored on genuine disconfirmation attempts, not on agreement. ` +
      `Grade each claim: "overturned" (falsifier satisfied — the claim is wrong), "sharpened" (falsifier partly satisfied — the claim was too broad, not wrong; propose a narrower claim + its falsifier), "held" (you searched and the falsifier was NOT satisfied), or "untested" (the run gave no opportunity to satisfy the falsifier). ` +
      `Cite only facts in the RECORD. Output ONLY JSON: {"grades":[{"id":"<claim id>","grade":"held|sharpened|overturned|untested","looked_for":"<what you searched for>","found":true|false,"evidence":["..."],"narrower":{"text":"...","falsifier":"..."}}]} (narrower only for sharpened).`;
    try {
      const msg = await client.messages.create({
        model: SOLO_MODEL, // classification with a rubric — Haiku, per the cost spec
        max_tokens: 1500,
        system: auditSystem,
        messages: [{ role: 'user', content: `${pack.record}\n\nGrade every claim above against the latest run. JSON only.` }],
      });
      const txt = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      const parsed = parseJson(txt);
      if (parsed?.grades && Array.isArray(parsed.grades)) grades = parsed.grades;
    } catch { /* audit failure → treat all as untested (safer than confirming) */ }
  }

  // ---- 3. deterministic audit rules (code, not a model) -----------------------------------
  const claimById = new Map<string, ClaimRow>(pack.claims.map((c) => [c.id, c]));
  const gradeById = new Map<string, Grade>();
  for (const g of grades) if (claimById.has(g.id)) gradeById.set(g.id, g);
  // any claim the audit didn't return → untested (never carry silently as confirmed)
  for (const c of pack.claims) if (!gradeById.has(c.id)) gradeById.set(c.id, { id: c.id, grade: 'untested' });

  for (const [id, g] of gradeById) {
    const c = claimById.get(id)!;
    // Rule 1: no unchangeability without a failed targeted rep. If a claim asserts invariance
    // and no completed rep targeted its marker and failed to move it, withdraw it.
    if (INVARIANT.test(c.text)) {
      const failedTargetedRep = pack.hasReps.some((r) => r.marker === c.marker && r.kept);
      if (!failedTargetedRep) (g as any).grade = 'withdrawn';
    }
  }

  // ---- 4. generation (Opus/Sonnet) — new falsifiable findings ------------------------------
  const genSystem =
    `You are the Director writing a leader's private Leadership Profile from the RECORD below. Write in the SECOND PERSON, to the leader. ` +
    `Produce 2-4 FINDINGS about how THIS leader leads. EVERY finding is a claim that carries a FALSIFIER — the specific, observable thing in a future run that would prove it WRONG. A finding with no falsifier is decoration; do not write one. ` +
    `A finding that predicts nothing ("you are conflict-avoidant") is banned; a finding that predicts a great deal ("you soften bad news to anyone carrying a cost from a decision you made, and are blunt with everyone else") is the target. ` +
    `Ground everything in the RECORD: never invent a number, a quote, or a name. When evidence is thin (few runs), say so and stay directional; one instance is an instance, never a record. ` +
    `Do not restate claims already overturned; if this run overturned a prior claim, you may write its replacement. ` +
    `Also write a short 2-3 sentence "narrative" tying the findings together. Output ONLY JSON: {"findings":[{"text":"<second-person claim>","falsifier":"<what would overturn it>","marker":"<one of the six marker keys or null>"}],"narrative":"..."}`;
  const auditForGen = grades.length
    ? `\n\nAUDIT of prior claims this run:\n${[...gradeById.values()].map((g) => `- ${g.id}: ${g.grade}${g.narrower ? ` → narrower: "${g.narrower.text}"` : ''}`).join('\n')}`
    : '';

  let findings: Finding[] = [];
  let narrative = '';
  try {
    const msg = await client.messages.create({
      model: VOICE_MODEL,
      max_tokens: 1400,
      system: genSystem,
      messages: [{ role: 'user', content: `${pack.record}${auditForGen}\n\nWrite this leader's findings now (${pack.runNo} run(s), latest under a ${condition} team). JSON only.` }],
    });
    const txt = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
    const parsed = parseJson(txt);
    if (parsed?.findings && Array.isArray(parsed.findings)) findings = parsed.findings;
    if (typeof parsed?.narrative === 'string') narrative = parsed.narrative;
  } catch { return { ok: false, reason: 'generation_failed' }; }

  // ---- 5. grounding gate — every generated string must trace to the record ----------------
  findings = findings.filter((f) => f?.text && f?.falsifier && ground(`${f.text} ${f.falsifier}`, pack.record).hard.length === 0);
  if (narrative && ground(narrative, pack.record).hard.length > 0) narrative = ''; // drop ungrounded narrative rather than show it
  if (!findings.length) return { ok: false, reason: 'nothing_grounded' };

  // ---- 6. persist grades + new claims + the profile snapshot -------------------------------
  for (const [id, g] of gradeById) {
    const c = claimById.get(id)!;
    if (g.grade === 'held') {
      const isNewCondition = !c.conditions_tested.includes(condition);
      const conditions = isNewCondition ? [...c.conditions_tested, condition] : c.conditions_tested;
      await db.from('profile_claims').update({
        status: 'held',
        held_count: c.held_count + (isNewCondition ? 1 : 0), // confidence rises on NEW conditions, never repetition
        conditions_tested: conditions,
        graded_at_run: pack.runNo,
        evidence_refs: [],
      }).eq('id', id);
    } else if (g.grade === 'sharpened' && g.narrower?.text && g.narrower?.falsifier) {
      const { data: nw } = await db.from('profile_claims').insert({
        subject_id: subjectId, text: g.narrower.text, falsifier: g.narrower.falsifier, marker: c.marker,
        made_at_run: pack.runNo, status: 'open', conditions_tested: [condition],
      }).select('id').single<any>();
      await db.from('profile_claims').update({ status: 'sharpened', graded_at_run: pack.runNo, superseded_by: nw?.id ?? null }).eq('id', id);
    } else if (g.grade === 'overturned') {
      await db.from('profile_claims').update({ status: 'overturned', graded_at_run: pack.runNo }).eq('id', id);
    } else if ((g as any).grade === 'withdrawn') {
      await db.from('profile_claims').update({ status: 'withdrawn', graded_at_run: pack.runNo }).eq('id', id);
    } else {
      // untested — never silently carried as confirmed; just record that it was graded this run
      await db.from('profile_claims').update({ graded_at_run: pack.runNo }).eq('id', id);
    }
  }

  for (const f of findings) {
    await db.from('profile_claims').insert({
      subject_id: subjectId, text: f.text, falsifier: f.falsifier, marker: f.marker ?? null,
      made_at_run: pack.runNo, status: 'open', conditions_tested: [condition],
    });
  }

  await db.from('leadership_profiles').insert({
    subject_id: subjectId,
    run_no: pack.runNo,
    session_id: pack.latestSessionId,
    body_json: {
      narrative,
      findingsCount: findings.length,
      audit: [...gradeById.values()].map((g) => ({ id: g.id, grade: (g as any).grade })),
      condition,
      generated_run: pack.runNo,
    },
    model: VOICE_MODEL,
  });

  return { ok: true, runNo: pack.runNo };
}
