import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { anthropicApiKey, SOLO_MODEL } from '@/lib/env';
import { fireInject } from '@/lib/inject';

// Director-AI (Roadmap Horizon 1, reserved by 0009's injects.trigger_json). The layer
// that decides WHEN / WHETHER / to WHOM the authored beats fire in a live session —
// instead of a facilitator hand-firing each one on a fixed clock. It reads the session
// state (time elapsed, who's engaged, what's been delivered/ignored) and releases the
// beats whose moment has come, holding the ones whose condition isn't met yet and
// pacing so no single seat gets buried in one tick.
//
// Two layers, per the doc:
//   • deterministic (always on): time-gate (delay_min elapsed) + not-already-fired →
//     fire; fireInject's own cancelIf still defuses no-response nags. This alone
//     replaces the manual clock-watching.
//   • AI (when a key is set + enabled): for beats carrying a free-text `cond` the
//     rule engine can't parse, hand the condition + a session digest to Claude to
//     decide fire/hold, and pace intensity per seat. Falls back to firing on failure.
//
// Runs on a tick: Vercel Cron hits /api/cron/director on an interval (no external
// scheduler), and /api/facilitator/director serves manual/preview ticks from the
// console. The scripted timing stays the deterministic fallback whenever the Director
// is off.

type Db = ReturnType<typeof createAdminClient>;

export interface DirectorDecision {
  injectId: string;
  seat: string | null;
  kind: string;
  delayMin: number;
  cond: string | null;
  action: 'fire' | 'hold' | 'defused' | 'skip';
  by: 'rule' | 'ai';
  reason: string;
}
export interface DirectorReport {
  ok: boolean;
  reason?: string;
  sessionId?: string;
  elapsedMin?: number;
  aiUsed?: boolean;
  evaluated?: number;
  fired?: number;
  held?: number;
  dryRun?: boolean;
  decisions?: DirectorDecision[];
}

interface Candidate {
  id: string;
  seatId: string | null;
  seat: string | null;
  kind: string;
  delayMin: number;
  cond: string | null;
}

/** Time-gate: which not-yet-fired beats have reached their T+delay. Pure. */
export function timingEligible(candidates: Candidate[], elapsedMin: number): Candidate[] {
  return candidates.filter((c) => elapsedMin >= c.delayMin);
}

export async function runDirector(sessionId: string, opts: { dryRun?: boolean; useAI?: boolean } = {}): Promise<DirectorReport> {
  const db = createAdminClient();

  const { data: session } = await db.from('sessions').select('id, scenario_id, status, started_at').eq('id', sessionId).maybeSingle<any>();
  if (!session) return { ok: false, reason: 'not_found' };
  if (session.status !== 'live') return { ok: false, reason: 'session_not_live' };

  const startedAt = session.started_at ? Date.parse(session.started_at) : Date.now();
  const elapsedMin = Math.max(0, (Date.now() - startedAt) / 60000);

  const [{ data: injects }, { data: fires }, { data: seats }] = await Promise.all([
    db.from('injects').select('id, seat_id, kind, payload_json, trigger_json, order_idx').eq('scenario_id', session.scenario_id).order('order_idx', { ascending: true }),
    db.from('inject_fires').select('inject_id').eq('session_id', sessionId),
    db.from('seats').select('id, key').eq('scenario_id', session.scenario_id),
  ]);
  const firedIds = new Set((fires ?? []).map((f: any) => f.inject_id));
  const seatKey = new Map((seats ?? []).map((s: any) => [s.id, s.key]));

  const candidates: Candidate[] = (injects ?? [])
    .filter((i: any) => !firedIds.has(i.id))
    .map((i: any) => ({
      id: i.id,
      seatId: i.seat_id ?? null,
      seat: i.seat_id ? seatKey.get(i.seat_id) ?? null : null,
      kind: i.kind,
      delayMin: Number(i.payload_json?.delay_min ?? i.trigger_json?.after_min ?? 0),
      cond: i.payload_json?.cond ?? null,
    }));

  const eligible = timingEligible(candidates, elapsedMin);

  // AI layer: judge the free-text conditions + pace. Deterministic fallback = fire all.
  const holds = new Map<string, string>(); // injectId → AI hold reason
  let aiUsed = false;
  const condEligible = eligible.filter((c) => c.cond);
  if (opts.useAI && condEligible.length) {
    const verdicts = await askDirector(db, sessionId, elapsedMin, condEligible, seatKey);
    if (verdicts) {
      aiUsed = true;
      for (const c of condEligible) {
        const v = verdicts.find((x) => x.injectId === c.id);
        if (v && v.fire === false) holds.set(c.id, v.reason || 'condition not met yet');
      }
    }
  }

  const decisions: DirectorDecision[] = [];
  let fired = 0;
  let held = 0;
  for (const c of candidates) {
    const base = { injectId: c.id, seat: c.seat, kind: c.kind, delayMin: c.delayMin, cond: c.cond };
    if (elapsedMin < c.delayMin) {
      decisions.push({ ...base, action: 'hold', by: 'rule', reason: `waiting for T+${c.delayMin} (now T+${Math.round(elapsedMin)})` });
      held++;
      continue;
    }
    if (holds.has(c.id)) {
      decisions.push({ ...base, action: 'hold', by: 'ai', reason: holds.get(c.id)! });
      held++;
      continue;
    }
    if (opts.dryRun) {
      decisions.push({ ...base, action: 'fire', by: aiUsed && c.cond ? 'ai' : 'rule', reason: 'eligible — would fire' });
      fired++;
      continue;
    }
    const res = await fireInject(sessionId, c.id, { firedBy: null });
    if (res.fired) {
      decisions.push({ ...base, action: 'fire', by: aiUsed && c.cond ? 'ai' : 'rule', reason: `delivered to ${res.delivered}` });
      fired++;
    } else if (res.reason === 'cancelled') {
      decisions.push({ ...base, action: 'defused', by: 'rule', reason: 'cancelIf: reply defused it' });
    } else {
      decisions.push({ ...base, action: 'skip', by: 'rule', reason: res.reason ?? 'not fired' });
    }
  }

  if (!opts.dryRun) {
    await db.from('events').insert({
      session_id: sessionId,
      type: 'director_tick',
      channel: 'system',
      target: null,
      payload_json: { elapsed_min: Math.round(elapsedMin), evaluated: candidates.length, fired, held, ai: aiUsed },
    });
  }

  return { ok: true, sessionId, elapsedMin: Math.round(elapsedMin), aiUsed, evaluated: candidates.length, fired, held, dryRun: !!opts.dryRun, decisions };
}

// ---- the AI Director: judge conditions + pace, from a compact session digest --------

interface DirectorVerdict {
  injectId: string;
  fire: boolean;
  reason: string;
}

/** Per-seat engagement digest — the behavioral read the Director paces against. */
async function buildSessionDigest(db: Db, sessionId: string, seatKey: Map<string, string>): Promise<string> {
  const { data: events } = await db
    .from('events')
    .select('seat_id, type, target, payload_json')
    .eq('session_id', sessionId)
    .in('type', ['message_sent', 'thread_opened', 'inject_delivered']);
  const bySeat = new Map<string, { sent: number; opened: number; delivered: number; lastSentTo: string | null }>();
  for (const e of (events ?? []) as any[]) {
    const key = e.seat_id ? seatKey.get(e.seat_id) ?? e.seat_id : 'all';
    const row = bySeat.get(key) ?? { sent: 0, opened: 0, delivered: 0, lastSentTo: null };
    if (e.type === 'message_sent') { row.sent++; row.lastSentTo = e.target; }
    else if (e.type === 'thread_opened') row.opened++;
    else if (e.type === 'inject_delivered') row.delivered++;
    bySeat.set(key, row);
  }
  const lines = [...bySeat.entries()].map(
    ([seat, r]) => `- ${seat}: ${r.sent} sent, ${r.opened} opened, ${r.delivered} beats delivered${r.lastSentTo ? `, last → ${r.lastSentTo}` : ''}`,
  );
  return lines.join('\n') || '(no participant activity yet)';
}

async function askDirector(
  db: Db,
  sessionId: string,
  elapsedMin: number,
  candidates: Candidate[],
  seatKey: Map<string, string>,
): Promise<DirectorVerdict[] | null> {
  try {
    const digest = await buildSessionDigest(db, sessionId, seatKey);
    const refToId = new Map<string, string>();
    const beatLines = candidates.map((c) => {
      const ref = c.id.slice(0, 8);
      refToId.set(ref, c.id);
      return `[${ref}] → ${c.seat ?? 'all'} (${c.kind}, T+${c.delayMin}): condition = "${c.cond}"`;
    });
    const system =
      'You are the Director of a live leadership crisis simulation. Authored beats each carry ' +
      'a fire-condition written in plain language (e.g. "David has not responded", "no escalation ' +
      'by T+20"). Given the current session state and the beats whose scheduled time has arrived, ' +
      'decide for EACH beat whether its condition is now met and it should fire, or whether to hold ' +
      "it. Also PACE: don't release several beats onto the same seat in one tick — fire the most " +
      'important and hold the rest for a later tick. When unsure, prefer firing (the beat was ' +
      'scheduled for now). Return ONLY strict minified JSON: {"decisions":[{"ref":"<ref>","fire":true|false,"reason":"<short>"}]}';
    const user = `Elapsed: T+${Math.round(elapsedMin)} minutes.\n\nSESSION STATE (per seat):\n${digest}\n\nBEATS DUE THIS TICK:\n${beatLines.join('\n')}`;

    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({ model: SOLO_MODEL, max_tokens: 700, system, messages: [{ role: 'user', content: user }] });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
    return parseDirectorVerdicts(text, refToId);
  } catch {
    return null; // no key / model / parse error → deterministic firing stands
  }
}

/** Parse the Director's JSON and map short refs back to inject ids. Pure. */
export function parseDirectorVerdicts(text: string | null | undefined, refToId: Map<string, string>): DirectorVerdict[] | null {
  if (!text) return null;
  const t = text.trim().replace(/```json/gi, '').replace(/```/g, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try {
    const parsed = JSON.parse(t.slice(a, b + 1));
    if (!Array.isArray(parsed?.decisions)) return null;
    return parsed.decisions
      .map((d: any) => {
        const id = refToId.get(String(d.ref ?? '').slice(0, 8));
        return id ? { injectId: id, fire: d.fire !== false, reason: String(d.reason ?? '') } : null;
      })
      .filter((d: any): d is DirectorVerdict => !!d);
  } catch {
    return null;
  }
}
