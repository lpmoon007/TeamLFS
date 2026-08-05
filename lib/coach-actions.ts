'use server';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, VOICE_MODEL } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentFacilitator } from '@/lib/auth';
import { isAdmin } from '@/lib/facilitator-session';
import { buildEvidencePack } from '@/lib/profile/evidence-pack';
import { ground, repairPrompt, REFUSAL } from '@/lib/profile/grounding';
import { validateCue, rejectionNote } from '@/lib/profile/cue-validator';

// The Leadership Coach — the Director evolved into ONE cross-run coach grounded in the whole
// record (Screen-13 coach.js). It talks across all of a person's runs, cites the claim ledger,
// and can only propose behaviour change through two validated tools. Every reply passes the
// grounding gate before it reaches the leader: one repair attempt, then a refusal — a figure
// or quote it can't trace to the record never renders.

export interface CoachTurn { role: 'user' | 'assistant'; content: string }
export interface CoachCard {
  type: 'commitment' | 'cue';
  rep?: string; why?: string; targets?: string; // commitment
  cue?: string; action?: string; anchor?: string; marker?: string; // if-then
}
export interface CoachReply { ok: boolean; reply?: string; cards?: CoachCard[]; repaired?: boolean; refused?: boolean; reason?: string }

function systemPrompt(leader: string, runs: number, record: string): string {
  return (
    `You are Director-AI, the leadership coach inside Leadership Failure Simulations. You are talking to ${leader}, who has completed ${runs} simulation run${runs === 1 ? '' : 's'}. They are reviewing their own behavioural record with you.\n\n` +
    `=== THE ONLY THING YOU KNOW ===\nEverything you know about them is in the RECORD below — generated from their actual messages, decisions, timings, and the six normalised markers.\n\nRECORD:\n${record}\n\n` +
    `=== ABSOLUTE RULES ===\n` +
    `1. NEVER invent, embellish, or extrapolate a fact, number, quote, date, name or event. If it is not in the RECORD, you do not know it.\n` +
    `2. If they ask something the RECORD cannot answer, SAY SO plainly and briefly, name why, and offer what you can speak to. This includes personality type, comparison to other executives or benchmarks, and their real colleagues' opinions.\n` +
    `3. Never flatter. Never pad. Do not open with "Great question." Do not summarise what they just said back to them.\n` +
    `4. Quote their own words and cite specific runs, weeks and days when you have them. Specificity is the entire value you provide.\n` +
    `5. You are allowed — encouraged — to say an earlier finding was WRONG, and to own it when a claim in the ledger was overturned.\n` +
    `6. Never tell them there is a "right answer" to a scenario. You rule on evidence, not ideals.\n` +
    `7. Make longitudinal claims on the SIX NORMALISED MARKERS, never by stacking raw scenario scores — a hard scenario must never read as a decline. If they compare raw scores across scenarios, correct them.\n` +
    `8. State CONFIDENCE whenever you assert a pattern (high / moderate / provisional) and say what would sharpen it. Never present a one-run observation as established.\n` +
    `9. Distinguish a GAP from an INVARIANT using the ledger. Never list both as weaknesses.\n` +
    `10. Never rank them against other executives or cite a percentile — you have no cohort data. Decline and redirect to their own record.\n` +
    `11. FALSIFIABILITY. Every claim you make must come with the observation that would overturn it, if they ask. When they ask "what would change your mind about that?", answer with the specific falsifier — never "more data" or "time will tell." If a claim has no falsifier, say plainly that it is decoration and drop it.\n` +
    `12. Confidence rises only when a claim survives a NEW condition, never by repeating across similar runs. If you notice yourself confirming an earlier finding, actively look for the evidence that would break it first and say what you looked for.\n` +
    `13. SMALL SAMPLES. State the number of instances behind any claim drawn from fewer than three. One instance is an instance, never a pattern — say "once" or "n=1", not "you always" or "0-for-1". Absolute words (always, never, consistently) are permitted only when the count appears in the same sentence. A validator enforces this and will send your reply back.\n\n` +
    `=== HOW YOU TALK ===\nDirect, calm, unsentimental, warm underneath. A serious coach talking to a serious person, not a chatbot. Short paragraphs. No bullet lists unless they ask. Never use emoji or headers. 2-4 short paragraphs normally. Aim every answer at the mechanism, not the score.\n\n` +
    `=== EVIDENCE CHIPS ===\nEnd an answer with evidence chips ONLY when you have made specific factual claims. On its own final line: [[EV: label = value | label = value]] — two to four chips, labels under 18 characters.\n\n` +
    `=== BEHAVIOUR CHANGE (tools) ===\nWhen the conversation has clearly landed on a behaviour worth changing, propose ONE 30-day daily rep with the propose_commitment tool — never in your first message, never more than one at a time, only when a specific behaviour is identified. When they need something to catch in the moment instead, use propose_if_then — do NOT write the cue in prose; the tool validates its shape and will reject a generic cue, so read the rejection and rewrite. A cue about a feeling must be translated into the observable behaviour that feeling produces in their log — never cue the feeling itself.`
  );
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'propose_commitment',
    description: 'Propose one 30-day daily rep for the leader to commit to. Only call when a specific behaviour has been identified in the conversation.',
    input_schema: {
      type: 'object',
      properties: {
        rep: { type: 'string', description: 'The daily behaviour, one sentence, phrased as "Each day, …" — small enough to do on their worst day.' },
        why: { type: 'string', description: 'Two sentences on why this rep and not another, referencing their ledger or a specific run.' },
        targets: { type: 'string', description: 'Short label for what it targets, e.g. "information discipline, held condition".' },
      },
      required: ['rep', 'why'],
    },
  },
  {
    name: 'propose_if_then',
    description: 'Propose ONE implementation-intention cue to catch in the moment. Validated for shape; rejected if generic — read the rejection and rewrite.',
    input_schema: {
      type: 'object',
      properties: {
        cue: { type: 'string', description: 'The WHEN half. Self-observable in the moment: a count, an artifact, or a physical act. Never an interior state or a judgement.' },
        action: { type: 'string', description: 'The THEN half. One definite action, under twenty words, doable in under a minute. No hedging.' },
        anchor: { type: 'string', description: 'The specific logged moment this comes from. Required.' },
        marker: { type: 'string', description: 'Which of the six markers this serves.' },
      },
      required: ['cue', 'action', 'anchor'],
    },
  },
];

export async function askLeaderCoach(params: { history: CoachTurn[]; question: string; subjectId?: string }): Promise<CoachReply> {
  const q = params.question.trim();
  if (!q) return { ok: false, reason: 'empty' };
  const me = await currentFacilitator();
  if (!me) return { ok: false, reason: 'not_signed_in' };

  let key: string;
  try { key = anthropicApiKey(); } catch { return { ok: false, reason: 'no_api_key' }; }

  const db = createAdminClient();
  let subject: any = null;
  if (params.subjectId) {
    // a facilitator/coach reviewing a specific person's profile (coach-visibility per spec)
    if (!(await isAdmin())) return { ok: false, reason: 'forbidden' };
    ({ data: subject } = await db.from('subjects').select('id, display_name, handle').eq('id', params.subjectId).maybeSingle<any>());
  } else {
    if (me.isMaster || !/@/.test(me.email)) return { ok: false, reason: 'not_signed_in' };
    ({ data: subject } = await db.from('subjects').select('id, display_name, handle').eq('handle', me.email.toLowerCase()).maybeSingle<any>());
  }
  if (!subject) return { ok: false, reason: 'no_profile' };
  const pack = await buildEvidencePack(subject.id);
  if (!pack) return { ok: false, reason: 'no_runs' };

  const system = systemPrompt(subject.display_name || subject.handle || 'you', pack.runNo, pack.record);
  const client = new Anthropic({ apiKey: key });
  const history = (params.history ?? []).slice(-12).map((t) => ({ role: t.role, content: t.content }));
  const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: q }];
  const cards: CoachCard[] = [];

  try {
    // agentic tool loop — bounded; cue rejections loop back so the model rewrites
    let text = '';
    for (let i = 0; i < 4; i++) {
      const msg = await client.messages.create({ model: VOICE_MODEL, max_tokens: 1300, system, messages, tools: TOOLS });
      const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (msg.stop_reason === 'tool_use' && toolUses.length) {
        messages.push({ role: 'assistant', content: msg.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          const input = tu.input as any;
          if (tu.name === 'propose_commitment') {
            cards.push({ type: 'commitment', rep: input.rep, why: input.why, targets: input.targets });
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'Commitment card shown to the leader with a Commit button. Do not repeat the rep text; briefly land why it is the right one.' });
          } else if (tu.name === 'propose_if_then') {
            const v = validateCue(input.cue ?? '', input.action ?? '', input.anchor ?? '');
            if (!v.ok) {
              results.push({ type: 'tool_result', tool_use_id: tu.id, content: rejectionNote(v), is_error: true });
            } else {
              cards.push({ type: 'cue', cue: input.cue, action: input.action, anchor: input.anchor, marker: input.marker });
              results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'Cue passed validation and is shown to the leader. Do not repeat its text; say in one or two sentences why this cue and not a broader one.' });
            }
          }
        }
        messages.push({ role: 'user', content: results });
        continue;
      }
      text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
      break;
    }
    if (!text) return { ok: true, reply: 'I didn’t have anything grounded to add there — ask me something in your record.', cards };

    // grounding gate — one repair attempt, then refusal
    let v = ground(text, pack.record);
    let repaired = false;
    if (!v.ok) {
      const retry = [...messages, { role: 'assistant' as const, content: text }, { role: 'user' as const, content: repairPrompt(v) }];
      const msg2 = await client.messages.create({ model: VOICE_MODEL, max_tokens: 1300, system, messages: retry });
      const text2 = msg2.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
      const v2 = ground(text2, pack.record);
      if (v2.hard.length === 0) { text = text2; v = v2; repaired = true; }
      else return { ok: true, reply: REFUSAL, cards, refused: true };
    }
    return { ok: true, reply: text, cards, repaired };
  } catch {
    return { ok: false, reason: 'model_unreachable' };
  }
}

/** Commit a coach-proposed rep or if-then cue as a 30-day challenge (their own profile). */
export async function commitFromCoach(params: { behavior: string; cue?: string; focusLabel?: string }): Promise<{ ok: boolean; reason?: string }> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return { ok: false, reason: 'not_signed_in' };
  const behavior = params.behavior.trim();
  if (behavior.length < 4) return { ok: false, reason: 'too_short' };
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  if (!subject) return { ok: false, reason: 'no_profile' };
  const { error } = await db.from('challenges').insert({
    subject_id: subject.id,
    behavior,
    cue: params.cue?.trim() || null,
    focus_label: params.focusLabel?.trim() || null,
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
