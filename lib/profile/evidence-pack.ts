import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSoloDebrief } from '@/lib/solo-debrief';
import { resolveSubjectRuns } from '@/lib/profile/subject-runs';

// The evidence pack — the grounding source, assembled per person from the event log. Nothing
// outside this pack is available to the audit or generation model; that is what makes the
// findings honest (Screen-13 handoff §1C, evidence-pack.js). Everything the model may cite —
// numbers, quotes, names — must appear here, or the grounding gate rejects it.

const CONDITION: Record<string, string> = { served: 'forthcoming', request: 'neutral', guarded: 'guarded', surprise: 'surprise' };
const strip = (s: string) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export interface ClaimRow {
  id: string;
  text: string;
  falsifier: string;
  marker: string | null;
  status: string;
  made_at_run: number;
  held_count: number;
  conditions_tested: string[];
}
export interface EvidencePack {
  record: string; // the grounding source + prompt context
  runNo: number; // completed-run count
  latestSessionId: string | null;
  latestCondition: string | null;
  claims: ClaimRow[]; // prior open/held claims to audit
  hasReps: { marker: string | null; kept: boolean }[]; // completed 30-day reps, for audit rule 1
}

/** Assemble the evidence pack for a subject (person). Returns null if they have no scored run. */
export async function buildEvidencePack(subjectId: string): Promise<EvidencePack | null> {
  const db = createAdminClient();

  const { data: subject } = await db.from('subjects').select('display_name, handle').eq('id', subjectId).maybeSingle<any>();
  const name = subject?.display_name || subject?.handle || 'this leader';

  const rows = await resolveSubjectRuns(db, subjectId);
  if (!rows.length) return null;

  const scnIds = [...new Set(rows.map((p) => p.session.scenario_id).filter(Boolean))] as string[];
  const weekBy = new Map<string, number>();
  if (scnIds.length) {
    const { data: metas } = await db.from('scenario_meta').select('scenario_id, week_count').in('scenario_id', scnIds);
    for (const m of metas ?? []) if ((m as any).week_count) weekBy.set((m as any).scenario_id, (m as any).week_count);
  }

  type RunRec = { text: string; date: string | null };
  const runRecs: RunRec[] = [];
  await Promise.all(
    rows.map(async (p: any) => {
      const s = p.session;
      try {
        const d = await buildSoloDebrief(s.id, p.token);
        if (!d.ok) return;
        const dd = d.debrief;
        const decisions = dd.gameFilm.filter((m) => m.type === 'decision');
        const wc = weekBy.get(s.scenario_id) ?? null;
        if (wc && decisions.length < wc) return; // unfinished
        const condition = CONDITION[s.run_config?.disposition as string] ?? 'neutral';
        const markerLines = (dd.panel?.markers ?? [])
          .filter((m) => m.exercised && m.normalized !== null)
          .map((m) => `  - ${m.label}: ${m.normalized}/100 (${m.confidence})`)
          .join('\n');
        const cfLines = dd.counterfactuals
          .slice(0, 4)
          .map((c) => `  - ${c.who} held "${c.topic ?? 'a decisive fact'}" and you never asked${c.critical ? ' [critical]' : ''}`)
          .join('\n');
        const decLines = decisions.map((m) => `  - Wk${m.week}: "${strip(m.text)}"`).join('\n');
        const text =
          `RUN — ${dd.scenarioTitle} · ${condition} team · overall ${dd.overall}/100 (${dd.grade})\n` +
          `Six markers (normalised rates):\n${markerLines || '  - (none exercised)'}\n` +
          `Held facts you did not surface:\n${cfLines || '  - none — you surfaced what was held'}\n` +
          (dd.surfacedCount ? `You surfaced ${dd.surfacedCount} held item(s).\n` : '') +
          `Your weekly calls:\n${decLines || '  - (none)'}\n`;
        runRecs.push({ text, date: s.started_at ?? null });
      } catch {
        /* skip */
      }
    }),
  );
  if (!runRecs.length) return null;
  runRecs.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const runNo = runRecs.length;
  // stamp run numbers now that they're ordered
  const runBlock = runRecs.map((r, i) => `=== RUN ${String(i + 1).padStart(2, '0')} ===\n${r.text}`).join('\n');

  // latest run meta (drives generation's "what this run tested")
  const latest = rows
    .map((p: any) => p.session)
    .filter(Boolean)
    .sort((a: any, b: any) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))[0];
  const latestCondition = latest ? CONDITION[latest.run_config?.disposition as string] ?? 'neutral' : null;

  // prior claims (the ledger)
  const { data: claimRows } = await db
    .from('profile_claims')
    .select('id, text, falsifier, marker, status, made_at_run, held_count, conditions_tested')
    .eq('subject_id', subjectId)
    .in('status', ['open', 'held', 'sharpened'])
    .order('made_at_run', { ascending: true });
  const claims: ClaimRow[] = (claimRows ?? []).map((c: any) => ({
    id: c.id, text: c.text, falsifier: c.falsifier, marker: c.marker ?? null, status: c.status,
    made_at_run: c.made_at_run, held_count: c.held_count ?? 0, conditions_tested: c.conditions_tested ?? [],
  }));
  const claimBlock = claims.length
    ? claims.map((c, i) => `C${i + 1} [${c.id}] "${strip(c.text)}" — falsifier: ${strip(c.falsifier)} — status ${c.status}, tested under ${c.conditions_tested.join('/') || 'no conditions yet'}`).join('\n')
    : '(no prior claims — this is the first profile)';

  // completed 30-day reps (for audit rule 1: no invariant claim without a failed targeted rep)
  const { data: challenges } = await db.from('challenges').select('id, focus_key, target_days, created_at').eq('subject_id', subjectId);
  const hasReps: { marker: string | null; kept: boolean }[] = [];
  let repBlock = '(no 30-day reps on record)';
  if (challenges && challenges.length) {
    const ids = challenges.map((c: any) => c.id);
    const { data: checkins } = await db.from('challenge_checkins').select('challenge_id, did').in('challenge_id', ids);
    const kept = new Map<string, number>();
    for (const ci of checkins ?? []) if ((ci as any).did) kept.set((ci as any).challenge_id, (kept.get((ci as any).challenge_id) ?? 0) + 1);
    repBlock = challenges
      .map((c: any) => {
        const n = kept.get(c.id) ?? 0;
        hasReps.push({ marker: c.focus_key ?? null, kept: n >= 21 });
        return `  - rep on ${c.focus_key ?? 'a focus'}: ${n} kept check-ins (target ${c.target_days ?? 30} days)`;
      })
      .join('\n');
  }

  const record =
    `LEADER: ${name}. Played as self across ${runNo} completed run${runNo === 1 ? '' : 's'}.\n\n` +
    `=== SAMPLE SIZE — state n when it is under 3; one instance is an instance, never a record. Do not write "0-for-1" or "1-for-1". ===\n` +
    `You have ${runNo} run${runNo === 1 ? '' : 's'}. Any claim resting on ${runNo < 3 ? 'this few runs' : 'these runs'} must name its sample size and stay directional unless it has survived a NEW condition.\n\n` +
    `=== THE THREE NUMBER SYSTEMS (never mix) ===\n` +
    `Marker rates are normalised and comparable across scenarios — use these for every longitudinal claim. Run scores are weighted composites (will not equal the average of the six). Raw dimension scores are in-scenario only and never comparable across runs.\n\n` +
    `=== THE CLAIM LEDGER — every finding is a falsifiable claim ===\n` +
    `ARCHITECTURAL RULE: a finding that predicts nothing can never be wrong, so it is not a finding. Every claim carries a FALSIFIER. If asked "what would change your mind?", you must answer with the falsifier.\n${claimBlock}\n\n` +
    `=== 30-DAY REPS (self-reported — never cite as observed in-sim behaviour) ===\n${repBlock}\n\n` +
    `=== THE RUNS ===\n${runBlock}\n=== END OF RECORD ===`;

  return { record, runNo, latestSessionId: latest?.id ?? null, latestCondition, claims, hasReps };
}
