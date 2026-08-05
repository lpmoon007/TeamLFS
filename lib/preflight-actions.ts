'use server';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, VOICE_MODEL } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentFacilitator } from '@/lib/auth';
import { buildEvidencePack } from '@/lib/profile/evidence-pack';
import { buildIndex, validate as groundValidate, repairPrompt } from '@/lib/profile/grounding';
import { validateCue, rejectionNote } from '@/lib/profile/cue-validator';

// Before You Decide — the profile pointed forward at a REAL decision. It reasons about the
// leader's PATTERN, never their situation (any claim about their business would be invention),
// and hands them the questions their record says they'll skip + a behavioural prediction.
// Logging it turns the prediction into evidence: two weeks on, "did that happen?".

export interface PreflightQuestion { question: string; why: string; basis: string }
export interface Preflight {
  read: string;
  questions: PreflightQuestion[];
  cue: { cue: string; action: string; anchor: string };
  afterwards: { prediction: string; base_rate: string };
}
export interface DecisionRow {
  id: string;
  text: string;
  landsOn: string | null;
  question: string | null;
  prediction: string | null;
  verdict: 'yes' | 'no' | null;
  createdAt: string;
  due: boolean; // >14 days and unresolved
}

async function subjectId(): Promise<string | null> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return null;
  const { data } = await createAdminClient().from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  return data?.id ?? null;
}

function system(leader: string, runs: number, record: string): string {
  return (
    `You are Director-AI running a PRE-FLIGHT for ${leader}, who has completed ${runs} simulation run${runs === 1 ? '' : 's'}. They are about to make a real decision at work and have described it in one or two lines.\n\n` +
    `RECORD (the only thing you know about them):\n${record}\n\n` +
    `=== WHAT THIS IS, AND IS NOT ===\nYou are NOT advising them on the decision. You do not know their business, their people, their numbers, or the right answer — any claim about their specific situation would be invention. What you have is how they DECIDE. So you apply their pattern forward and hand them the questions their own record says they will skip.\n\n` +
    `=== ABSOLUTE RULES ===\n` +
    `1. Never invent a fact about their situation, company, colleagues, or the decision. You may restate their own words back, nothing more.\n` +
    `2. Every figure, quotation and name must come from the RECORD (or their own input). A validator checks this and will reject your output.\n` +
    `3. State base rates with their denominator: "in 3 of 4 runs". One instance is an instance, never a pattern. Absolute words only with the count in the same sentence.\n` +
    `4. The three questions must be ones only THEY can answer — pointing at what they have not gone and found out. Never a question you are secretly answering for them.\n` +
    `5. No flattery, no preamble. Address them as "you".\n` +
    `6. Never predict a business outcome. You may predict THEIR behaviour, because that is what the record supports.\n\n` +
    `Draw the three questions from their actual failure modes (their lowest markers and the held facts in the record). Call emit_preflight exactly once. Do not write prose outside the tool call.`
  );
}

const TOOL: Anthropic.Tool = {
  name: 'emit_preflight',
  description: 'Emit the pre-flight. Call exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      read: { type: 'string', description: 'Two or three sentences: what their record says about this SHAPE of decision. Second person. No claims about their actual situation.' },
      questions: {
        type: 'array', minItems: 3, maxItems: 3,
        items: { type: 'object', properties: { question: { type: 'string' }, why: { type: 'string' }, basis: { type: 'string', description: 'Short evidence label with its denominator, e.g. "3 of 4 runs".' } }, required: ['question', 'why', 'basis'] },
      },
      cue: { type: 'object', properties: { cue: { type: 'string' }, action: { type: 'string' }, anchor: { type: 'string' } }, required: ['cue', 'action', 'anchor'] },
      afterwards: { type: 'object', properties: { prediction: { type: 'string', description: 'What they will likely experience if they skip these — about THEIR BEHAVIOUR, never a business outcome.' }, base_rate: { type: 'string' } }, required: ['prediction', 'base_rate'] },
    },
    required: ['read', 'questions', 'cue', 'afterwards'],
  },
};

const flat = (pf: Preflight) => [pf.read, ...pf.questions.map((q) => `${q.question} ${q.why} ${q.basis}`), pf.cue.cue, pf.cue.action, pf.cue.anchor, pf.afterwards.prediction, pf.afterwards.base_rate].join('\n');

export async function runPreflight(params: { decision: string; who?: string; when?: string }): Promise<{ ok: boolean; preflight?: Preflight; repaired?: boolean; reason?: string }> {
  const decision = params.decision.trim();
  if (decision.length < 8) return { ok: false, reason: 'too_short' };
  const sid = await subjectId();
  if (!sid) return { ok: false, reason: 'not_signed_in' };
  let key: string;
  try { key = anthropicApiKey(); } catch { return { ok: false, reason: 'no_api_key' }; }
  const pack = await buildEvidencePack(sid);
  if (!pack) return { ok: false, reason: 'no_runs' };

  const me = await currentFacilitator();
  const sys = system(me?.displayName || me?.email || 'you', pack.runNo, pack.record);
  // index their own input alongside the record, or the validator flags their own figures back
  const idx = buildIndex(`${pack.record}\n${decision}\n${params.who ?? ''}`);
  const client = new Anthropic({ apiKey: key });
  const userMsg = `Decision: ${decision}\nLands hardest on: ${params.who || 'not stated'}\nMust be called: ${params.when || 'not stated'}`;

  const callOnce = async (messages: Anthropic.MessageParam[]): Promise<Preflight | { rejection: string } | null> => {
    for (let i = 0; i < 3; i++) {
      const msg = await client.messages.create({ model: VOICE_MODEL, max_tokens: 1500, system: sys, messages, tools: [TOOL] });
      const tu = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!tu) return null;
      const a = tu.input as any;
      const v = validateCue(a.cue?.cue ?? '', a.cue?.action ?? '', a.cue?.anchor ?? '');
      if (!v.ok) {
        messages.push({ role: 'assistant', content: msg.content });
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tu.id, content: rejectionNote(v), is_error: true }] });
        continue;
      }
      return a as Preflight;
    }
    return null;
  };

  try {
    let pf = await callOnce([{ role: 'user', content: userMsg }]);
    if (!pf || 'rejection' in (pf as any)) return { ok: false, reason: 'no_preflight' };
    let repaired = false;
    let g = groundValidate(flat(pf as Preflight), idx);
    if (!g.ok && g.hard.length) {
      const pf2 = await callOnce([{ role: 'user', content: userMsg }, { role: 'user', content: repairPrompt(g) }]);
      if (!pf2 || 'rejection' in (pf2 as any)) return { ok: false, reason: 'grounding' };
      const g2 = groundValidate(flat(pf2 as Preflight), idx);
      if (g2.hard.length) return { ok: false, reason: 'grounding' };
      pf = pf2; repaired = true;
    }
    return { ok: true, preflight: pf as Preflight, repaired };
  } catch {
    return { ok: false, reason: 'model_unreachable' };
  }
}

export async function logDecision(params: { text: string; who?: string; when?: string; question?: string; prediction?: string }): Promise<{ ok: boolean; reason?: string }> {
  const sid = await subjectId();
  if (!sid) return { ok: false, reason: 'not_signed_in' };
  const { error } = await createAdminClient().from('preflight_decisions').insert({
    subject_id: sid, text: params.text.trim(), lands_on: params.who?.trim() || null, when_label: params.when?.trim() || null,
    question: params.question?.trim() || null, prediction: params.prediction?.trim() || null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function listDecisions(): Promise<DecisionRow[]> {
  const sid = await subjectId();
  if (!sid) return [];
  const { data } = await createAdminClient().from('preflight_decisions').select('*').eq('subject_id', sid).order('created_at', { ascending: false });
  const now = Date.now();
  return (data ?? []).map((d: any) => ({
    id: d.id, text: d.text, landsOn: d.lands_on ?? null, question: d.question ?? null, prediction: d.prediction ?? null,
    verdict: d.verdict ?? null, createdAt: d.created_at,
    due: !d.verdict && now - new Date(d.created_at).getTime() > 14 * 86_400_000,
  }));
}

/** Check-back: confirm/deny the prediction, or snooze (defer the due window a week). */
export async function resolveDecision(params: { id: string; verdict: 'yes' | 'no' | 'skip' }): Promise<{ ok: boolean }> {
  const sid = await subjectId();
  if (!sid) return { ok: false };
  const db = createAdminClient();
  if (params.verdict === 'skip') {
    await db.from('preflight_decisions').update({ created_at: new Date(Date.now() - 7 * 86_400_000).toISOString() }).eq('id', params.id).eq('subject_id', sid);
  } else {
    await db.from('preflight_decisions').update({ verdict: params.verdict, resolved_at: new Date().toISOString() }).eq('id', params.id).eq('subject_id', sid);
  }
  return { ok: true };
}
