'use server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { authParticipant } from '@/lib/participant-auth';
import { anthropicApiKey, SOLO_MODEL } from '@/lib/env';
import { resolveWeek } from '@/lib/solo-week';
import { scoreSoloRun, resolveDispositionFromHistory, subjectForParticipant } from '@/lib/spine';
import {
  applyDeltas,
  buildRefereeSystem,
  buildReplySystem,
  cleanReply,
  fallbackRuling,
  matchHold,
  parseRulingJSON,
  reconstitute,
  type Conduct,
  type Ruling,
} from '@/lib/solo-referee';

// Phase 4 — the heart. Pull-to-ask (advisor reply + held-info reveal) and the AI
// referee (free-text decision → ruling), same server-capability family as team
// npc-reply. Model call via the Anthropic SDK (SOLO_MODEL, default Haiku 4.5), with
// the deterministic fallback from crisis-engine.js when the key/model is unavailable.

async function complete(system: string, user: string, maxTokens: number): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({ model: SOLO_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch {
    return null; // no key / model error → caller uses the deterministic fallback
  }
}

async function loadContent(db: ReturnType<typeof createAdminClient>, scenarioId: string): Promise<any | null> {
  const { data } = await db
    .from('documents')
    .select('body_json')
    .eq('scenario_id', scenarioId)
    .eq('key', 'solo_content')
    .maybeSingle<any>();
  return data?.body_json ?? null;
}

/** Set the run's disposition from the intro screen (token-gated to the CEO). Lets the
 *  player choose the team they walk in with; persisted so the server-side hedge matches
 *  the client-side drip. */
export async function setRunDisposition(params: {
  sessionId: string;
  participantId: string;
  token: string;
  disposition: string;
}): Promise<{ ok: boolean }> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };
  const ok = ['served', 'request', 'guarded', 'surprise'].includes(params.disposition);
  if (!ok) return { ok: false };
  const { data: session } = await db.from('sessions').select('run_config').eq('id', params.sessionId).maybeSingle<any>();
  const run_config = { ...(session?.run_config ?? {}), disposition: params.disposition };
  await db.from('sessions').update({ run_config }).eq('id', params.sessionId);
  return { ok: true };
}

export interface AskResult {
  ok: boolean;
  reply?: string;
  hold?: { surfaced: boolean; hedged: boolean; text: string } | null;
}

/** Pull-to-ask: the CEO messages an advisor; reply in-character + maybe surface a held fact. */
export async function soloAsk(params: {
  sessionId: string;
  participantId: string;
  token: string;
  advisorKey: string;
  weekIdx: number;
  question: string;
}): Promise<AskResult> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };
  const content = await loadContent(db, auth.scenarioId);
  if (!content) return { ok: false };

  const advisor = (content.TEAM ?? []).find((t: any) => t.id === params.advisorKey);
  if (!advisor) return { ok: false };
  const w = resolveWeek(content, params.weekIdx, await runBranch(db, params.sessionId, params.participantId)) ?? {};

  // log the ask (message_sent — the directed act; not-asking is the omission)
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: 'message_sent',
    channel: 'message',
    target: params.advisorKey,
    payload_json: { body: params.question, solo: true, week: w.n, recipients: [params.advisorKey] },
  });

  const sys = buildReplySystem(advisor, w, content.COMPANY?.name ?? '', content.REFEREE_CONTEXT ?? '');
  const reply = cleanReply(await complete(sys, params.question, 220), advisor.fallbackReply);

  // held-info reveal: does the ask hit a hold this advisor holds this week?
  let hold: AskResult['hold'] = null;
  const holds = (w.holds ?? []).filter((h: any) => h.from === params.advisorKey);
  const disposition = await sessionDisposition(db, params.sessionId, params.participantId);
  for (const h of holds) {
    if (!matchHold(params.question, h)) continue;
    // guarded → hedge the first matching ask, reveal on a subsequent one
    const { data: prior } = await db
      .from('events')
      .select('id')
      .eq('session_id', params.sessionId)
      .eq('type', 'hold_hedged')
      .eq('target', params.advisorKey)
      .limit(1);
    const hedgeFirst = disposition === 'guarded' && (prior ?? []).length === 0;
    if (hedgeFirst) {
      hold = { surfaced: false, hedged: true, text: h.hedge ?? '' };
      await db.from('events').insert({ session_id: params.sessionId, participant_id: params.participantId, seat_id: auth.seatId, type: 'hold_hedged', channel: 'message', target: params.advisorKey, payload_json: { topic: h.topic, week: w.n } });
    } else {
      hold = { surfaced: true, hedged: false, text: h.reveal ?? '' };
      await db.from('events').insert({ session_id: params.sessionId, participant_id: params.participantId, seat_id: auth.seatId, type: 'hold_surfaced', channel: 'message', target: params.advisorKey, payload_json: { topic: h.topic, week: w.n, critical: !!h.critical } });
    }
    break;
  }
  return { ok: true, reply, hold };
}

// The run's effective disposition. A concrete dial ('served'|'request'|'guarded') is
// used as-is; 'surprise'/'auto' (or unset) is RESOLVED from the CEO's cross-session
// history (Phase 9, A3.2) — the team you get is a consequence of how you've led before.
async function sessionDisposition(
  db: ReturnType<typeof createAdminClient>,
  sessionId: string,
  participantId?: string,
): Promise<string> {
  const { data } = await db.from('sessions').select('run_config').eq('id', sessionId).maybeSingle<any>();
  const dial = data?.run_config?.disposition ?? 'request';
  if (dial !== 'surprise' && dial !== 'auto') return dial;
  if (!participantId) return 'request';
  const subjectId = await subjectForParticipant(db, sessionId, participantId);
  return (await resolveDispositionFromHistory(db, subjectId)).disposition;
}

// The run's decided branch (from the prior week's referee ruling) — resolves a branched
// week (e.g. Week-4 held/caved) to the version this playthrough earned.
async function runBranch(db: ReturnType<typeof createAdminClient>, sessionId: string, participantId: string): Promise<string | null> {
  const { data } = await db
    .from('rulings')
    .select('branch_key')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .not('branch_key', 'is', null)
    .order('week_idx', { ascending: false })
    .limit(1);
  return (data ?? [])[0]?.branch_key ?? null;
}

// Conduct = who the CEO asked / ignored, and which holds surfaced vs stayed hidden,
// read from the event log (the audit truth).
async function buildConduct(
  db: ReturnType<typeof createAdminClient>,
  sessionId: string,
  content: any,
  week: any,
  run: { reprieves: number; underBuzzer: boolean },
): Promise<Conduct> {
  const TEAM: any[] = content.TEAM ?? [];
  const firstName = (id: string) => (TEAM.find((t) => t.id === id)?.name ?? id).split(' ')[0];

  const { data: asks } = await db
    .from('events')
    .select('target')
    .eq('session_id', sessionId)
    .eq('type', 'message_sent')
    .in('target', TEAM.map((t) => t.id));
  const contactedIds = new Set((asks ?? []).map((e: any) => e.target));

  const { data: surfacedEv } = await db
    .from('events')
    .select('target, payload_json')
    .eq('session_id', sessionId)
    .eq('type', 'hold_surfaced');
  const surfacedByAdvisor = new Set((surfacedEv ?? []).map((e: any) => e.target));

  const holds = (week.holds ?? []) as any[];
  const surfaced = holds.filter((h) => surfacedByAdvisor.has(h.from)).map((h) => firstName(h.from));
  const missed = holds.filter((h) => !surfacedByAdvisor.has(h.from)).map((h) => firstName(h.from));

  return {
    asked: contactedIds.size,
    contactedNames: [...contactedIds].map((id) => firstName(id as string)),
    ignored: TEAM.filter((t) => !contactedIds.has(t.id)).map((t) => firstName(t.id)),
    surfaced,
    missed,
    reprieves: run.reprieves,
    underBuzzer: run.underBuzzer,
  };
}

export interface DecideResult {
  ok: boolean;
  ruling?: Ruling;
  drivers?: Record<string, number>;
  branchKey?: string | null;
}

/** The referee: rule the CEO's free-text decision → deltas/narrative/dims; persist.
 *  Conduct (who was asked, what was surfaced/missed) is computed server-side from the
 *  event log — the audit truth — not trusted from the client. */
export async function soloDecide(params: {
  sessionId: string;
  participantId: string;
  token: string;
  weekIdx: number;
  decisionText: string;
  drivers: Record<string, number>;
  reprieves: number;
  underBuzzer: boolean;
  decidedDay: number;
}): Promise<DecideResult> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };
  const text = params.decisionText.trim();
  if (text.length < 8) return { ok: false };
  const content = await loadContent(db, auth.scenarioId);
  if (!content) return { ok: false };
  const w = resolveWeek(content, params.weekIdx, await runBranch(db, params.sessionId, params.participantId)) ?? {};

  // log the decision act
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: 'message_sent',
    channel: 'message',
    target: 'decision',
    payload_json: { body: text, solo: true, week: w.n, decidedDay: params.decidedDay, underBuzzer: params.underBuzzer },
  });

  const conduct = await buildConduct(db, params.sessionId, content, w, {
    reprieves: params.reprieves,
    underBuzzer: params.underBuzzer,
  });

  // referee (model → strict JSON) with deterministic fallback
  const sys = buildRefereeSystem(content, w, params.drivers, conduct, params.decidedDay);
  let ruling = parseRulingJSON(await complete(sys, `CEO decision: "${text}"`, 600));
  if (ruling) {
    const validIds = new Set((content.TEAM ?? []).map((t: any) => t.id));
    ruling.teamReactions = (ruling.teamReactions ?? []).filter((r) => validIds.has(r.who));
    if (!ruling.teamReactions.length) ruling.teamReactions = fallbackRuling(content, text, conduct, params.decidedDay).teamReactions;
  } else {
    ruling = fallbackRuling(content, text, conduct, params.decidedDay);
  }

  const drivers = applyDeltas(content, params.drivers, ruling.deltas);

  // Optional weekly burn (e.g. Shockwave's cash burn): a fixed cost the world model
  // applies each week on top of the ruling's deltas. Content-driven via BURN_DRIVER +
  // the week's `burn` (fallback BURN_START); a no-op for scenarios without a burn.
  const burnKey: string | undefined = content.BURN_DRIVER;
  if (burnKey && drivers[burnKey] !== undefined) {
    const burn = Number(w.burn ?? content.BURN_START ?? 0);
    if (burn) {
      const dr = (content.DRIVERS ?? {})[burnKey] ?? {};
      drivers[burnKey] = Math.max(dr.min ?? 0, drivers[burnKey] - burn);
    }
  }

  // branch classifier (authored fn) over this decision
  let branchKey: string | null = null;
  const bk = reconstitute(content.branchKey);
  try {
    branchKey = bk ? String(bk([{ week: w.n, text }])) : null;
  } catch {
    branchKey = null;
  }

  // persist: run_drivers + rulings + a ruling event
  const driverRows = Object.keys(content.DRIVERS ?? {}).map((k) => ({
    session_id: params.sessionId,
    participant_id: params.participantId,
    week_idx: w.n,
    driver_key: k,
    value: drivers[k],
    delta: ruling!.deltas[k] ?? 0,
  }));
  if (driverRows.length) await db.from('run_drivers').upsert(driverRows, { onConflict: 'session_id,participant_id,week_idx,driver_key' });

  await db.from('rulings').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    week_idx: w.n,
    decision_text: text,
    narrative: ruling.narrative,
    dimension_scores: ruling.dims,
    conduct: conduct as any,
    branch_key: branchKey,
    buzzer: params.underBuzzer,
  });

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: 'decision_ruled',
    channel: 'system',
    target: `week-${w.n}`,
    payload_json: { dims: ruling.dims, deltas: ruling.deltas, branch: branchKey },
  });

  // Phase 9 — at the final decision, score the run off the raw log and append it to
  // the CEO's cross-session profile, so a solo playthrough builds the spine (and the
  // next run's disposition) exactly as a team session does at finalize. Best-effort.
  if (w.final) {
    try {
      await scoreSoloRun(db, params.sessionId, params.participantId);
    } catch {
      /* scoring is derived Layer-2 — never block the ruling on it */
    }
  }

  return { ok: true, ruling, drivers, branchKey };
}
