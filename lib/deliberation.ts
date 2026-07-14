'use server';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcast } from '@/lib/realtime-server';
import { sessionRoomChannel } from '@/lib/channels';
import type { Valence, BoardStance, BoardOption, DecisionBoard, DecisionLock } from '@/lib/deliberation-types';

// The Decision Room — the team's shared deliberation surface (Team Event-Log Spec §2
// catalog: proposal / stance / decision_lock). Everything is an APPEND-ONLY event on the
// LOCKED log; the board is reconstructed by reading those events (no new table). `t`
// (scenario_ms) is stamped SERVER-SIDE from started_at so ordering/gaps are authoritative
// — the whole Tier-B derivation (resilience, safety) is a function of that clock.

type Db = ReturnType<typeof createAdminClient>;

async function stampMs(db: Db, sessionId: string): Promise<{ ms: number; live: boolean }> {
  const { data } = await db.from('sessions').select('started_at, status').eq('id', sessionId).maybeSingle<any>();
  const start = data?.started_at ? new Date(data.started_at).getTime() : Date.now();
  return { ms: Math.max(0, Date.now() - start), live: data?.status === 'live' };
}

/** Put an option on the table. Returns the new optionId. */
export async function postProposal(params: {
  sessionId: string;
  participantId: string;
  seatId?: string | null;
  seatKey: string;
  summary: string;
}): Promise<{ ok: boolean; optionId?: string }> {
  const summary = params.summary.trim().slice(0, 280);
  if (!summary) return { ok: false };
  const db = createAdminClient();
  const { ms, live } = await stampMs(db, params.sessionId);
  if (!live) return { ok: false };
  const optionId = `opt-${randomUUID().slice(0, 8)}`;
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: params.seatId ?? null,
    type: 'proposal',
    channel: 'group',
    target: null,
    scenario_ms: ms,
    payload_json: { optionId, summary, seat: params.seatKey },
  });
  await broadcast(sessionRoomChannel(params.sessionId), 'room', { kind: 'proposal', optionId, seat: params.seatKey });
  return { ok: true, optionId };
}

/** Express support (+1) / neutral (0) / dissent (−1) on an option. Latest wins. */
export async function postStance(params: {
  sessionId: string;
  participantId: string;
  seatId?: string | null;
  seatKey: string;
  optionId: string;
  valence: Valence;
}): Promise<{ ok: boolean }> {
  if (![1, 0, -1].includes(params.valence)) return { ok: false };
  const db = createAdminClient();
  const { ms, live } = await stampMs(db, params.sessionId);
  if (!live) return { ok: false };
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: params.seatId ?? null,
    type: 'stance',
    channel: 'group',
    target: params.optionId,
    scenario_ms: ms,
    payload_json: { optionId: params.optionId, valence: params.valence, seat: params.seatKey },
  });
  await broadcast(sessionRoomChannel(params.sessionId), 'room', { kind: 'stance', optionId: params.optionId, seat: params.seatKey, valence: params.valence });
  return { ok: true };
}

/** Commit the team's decision on an option. Computes unanimity + dissenters from the
 *  latest stance per seat on that option at lock time. */
export async function lockDecision(params: {
  sessionId: string;
  participantId: string;
  seatId?: string | null;
  seatKey: string;
  optionId: string;
  text?: string;
}): Promise<{ ok: boolean }> {
  const db = createAdminClient();
  const { ms, live } = await stampMs(db, params.sessionId);
  if (!live) return { ok: false };

  const board = await getDecisionBoard(params.sessionId);
  const opt = board.options.find((o) => o.optionId === params.optionId);
  if (!opt) return { ok: false };
  const dissenters = opt.stances.filter((s) => s.valence === -1).map((s) => s.seat);
  const anyDissentOrAbstain = opt.stances.some((s) => s.valence !== 1);
  const text = (params.text ?? opt.summary).trim().slice(0, 400);

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: params.seatId ?? null,
    type: 'decision_lock',
    channel: 'group',
    target: params.optionId,
    scenario_ms: ms,
    payload_json: { optionId: params.optionId, text, seat: params.seatKey, unanimous: !anyDissentOrAbstain, dissenters },
  });
  await broadcast(sessionRoomChannel(params.sessionId), 'room', { kind: 'decision_lock', optionId: params.optionId, seat: params.seatKey });
  return { ok: true };
}

/** Reconstruct the current board from the append-only log. Latest stance per (seat,
 *  option) wins; lock is the most recent decision_lock. */
export async function getDecisionBoard(sessionId: string): Promise<DecisionBoard> {
  const db = createAdminClient();
  const { data: rows } = await db
    .from('events')
    .select('type, scenario_ms, ts, payload_json')
    .eq('session_id', sessionId)
    .in('type', ['proposal', 'stance', 'decision_lock'])
    .order('scenario_ms', { ascending: true, nullsFirst: true })
    .order('ts', { ascending: true });
  const events = (rows ?? []) as any[];

  const options = new Map<string, BoardOption>();
  const stanceByOptSeat = new Map<string, BoardStance>(); // key `${optionId}:${seat}`
  let lock: DecisionLock | null = null;

  for (const e of events) {
    const p = e.payload_json ?? {};
    if (e.type === 'proposal' && p.optionId) {
      if (!options.has(p.optionId)) {
        options.set(p.optionId, { optionId: p.optionId, summary: p.summary ?? '', author: p.seat ?? '?', createdMs: Number(e.scenario_ms ?? 0), stances: [] });
      }
    } else if (e.type === 'stance' && p.optionId && p.seat) {
      const v = Number(p.valence);
      const valence: Valence = v === 1 ? 1 : v === -1 ? -1 : 0;
      stanceByOptSeat.set(`${p.optionId}:${p.seat}`, { seat: p.seat, valence });
    } else if (e.type === 'decision_lock' && p.optionId) {
      lock = { optionId: p.optionId, text: p.text ?? '', by: p.seat ?? '?', unanimous: !!p.unanimous, dissenters: Array.isArray(p.dissenters) ? p.dissenters : [] };
    }
  }
  for (const [k, s] of stanceByOptSeat) {
    const optionId = k.slice(0, k.lastIndexOf(':'));
    options.get(optionId)?.stances.push(s);
  }
  return { options: [...options.values()], lock };
}
