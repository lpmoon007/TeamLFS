import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcast } from '@/lib/realtime-server';
import { seatChannel } from '@/lib/channels';
import { aiScoreSession, toTraitScoreRows, type SpineEvent } from '@/lib/scoring';
import { subjectForParticipant, appendProfile } from '@/lib/spine';

// Phase 7 — capture-log hardening at session end.
//
// The highest-signal events are the NEGATIVES (spine §1), and most of them can only
// be known once the clock stops: what was never opened, never answered, never read.
// finalizeSession sweeps those omissions into the append-only log, then computes a
// trait-score snapshot from the full (now omission-inclusive) event log and flips
// the session to ended. Guarded to run its sweep once.

type Db = ReturnType<typeof createAdminClient>;

export interface FinalizeResult {
  ok: boolean;
  alreadyEnded?: boolean;
  omissions?: number;
  scored?: number;
}

export async function finalizeSession(sessionId: string): Promise<FinalizeResult> {
  const db = createAdminClient();

  const { data: session } = await db
    .from('sessions')
    .select('id, status')
    .eq('id', sessionId)
    .maybeSingle<{ id: string; status: string }>();
  if (!session) return { ok: false };

  if (session.status === 'ended') {
    // Idempotent: don't double-materialize omission events. Re-score only.
    const scored = await scoreAndPersist(db, sessionId);
    await persistTeamPanelSafely(sessionId);
    return { ok: true, alreadyEnded: true, scored };
  }

  const omissions = await sweepOmissions(db, sessionId);
  await reconcileInjectResolution(db, sessionId);

  await db.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId);

  const scored = await scoreAndPersist(db, sessionId);
  await persistTeamPanelSafely(sessionId);

  // Live-flip the curtain for anyone still connected.
  const { data: parts } = await db
    .from('participants')
    .select('seat:seats!inner(key)')
    .eq('session_id', sessionId);
  for (const p of parts ?? []) {
    await broadcast(seatChannel(sessionId, (p as any).seat?.key), 'curtain', { ended: true });
  }

  return { ok: true, omissions, scored };
}

// Behavioral Panel (Tier B) — persist the team-as-one draw + roll it into the cohort
// ranges. Derived Layer-2; never fail finalize on it.
async function persistTeamPanelSafely(sessionId: string): Promise<void> {
  try {
    const { persistTeamPanel } = await import('@/lib/team-panel');
    await persistTeamPanel(sessionId);
  } catch {
    /* panel is a convenience read; finalize's real work already committed */
  }
}

// Materialize the negatives. Each is a derived Layer-1 event (derived=true) so it's
// distinguishable from a real-time act while still living in the one raw log.
async function sweepOmissions(db: Db, sessionId: string): Promise<number> {
  const { data: participants } = await db
    .from('participants')
    .select('id, seat_id')
    .eq('session_id', sessionId);
  const bySeat = new Map((participants ?? []).map((p: any) => [p.seat_id, p.id]));

  const { data: events } = await db
    .from('events')
    .select('participant_id, seat_id, type, target')
    .eq('session_id', sessionId);
  const ev = events ?? [];

  const rows: any[] = [];
  const mk = (seatId: string, type: string, channel: string, target: string | null, payload: any = {}) => {
    const pid = bySeat.get(seatId);
    if (!pid) return;
    rows.push({
      session_id: sessionId,
      participant_id: pid,
      seat_id: seatId,
      type,
      channel,
      target,
      derived: true,
      payload_json: payload,
    });
  };

  // brief_never_opened — participant never fired brief_opened.
  const briefOpenedSeats = new Set(ev.filter((e: any) => e.type === 'brief_opened').map((e: any) => e.seat_id));
  for (const p of participants ?? []) {
    if (!briefOpenedSeats.has((p as any).seat_id)) mk((p as any).seat_id, 'brief_never_opened', 'brief', null);
  }

  // email_unopened — delivered emails with no read_at.
  const { data: emails } = await db
    .from('emails')
    .select('id, seat_id, read_at')
    .eq('session_id', sessionId);
  for (const e of emails ?? []) {
    if (!(e as any).read_at) mk((e as any).seat_id, 'email_unopened', 'email', (e as any).id);
  }

  // thread_ignored — a thread with incoming (non-'me') messages that was never opened.
  const { data: threads } = await db
    .from('threads')
    .select('id, seat_id, contact_key')
    .eq('session_id', sessionId);
  const threadIds = (threads ?? []).map((t: any) => t.id);
  let msgs: any[] = [];
  if (threadIds.length) {
    const { data } = await db.from('messages').select('thread_id, sender').in('thread_id', threadIds);
    msgs = data ?? [];
  }
  const incomingThreads = new Set(msgs.filter((m) => m.sender !== 'me').map((m) => m.thread_id));
  const openedKeys = new Set(
    ev.filter((e: any) => e.type === 'thread_opened').map((e: any) => `${e.seat_id}:${e.target}`),
  );
  for (const t of threads ?? []) {
    const tt = t as any;
    if (incomingThreads.has(tt.id) && !openedKeys.has(`${tt.seat_id}:${tt.contact_key}`)) {
      mk(tt.seat_id, 'thread_ignored', 'message', tt.contact_key);
    }
  }

  if (rows.length) await db.from('events').insert(rows);
  return rows.length;
}

// A1.2 — reconcile each delivered inject to its final per-seat state from the log:
//   addressed  = the seat sent a message to that inject's contact after delivery
//   opened     = the seat opened that thread (but didn't address it)
//   ignored    = neither
async function reconcileInjectResolution(db: Db, sessionId: string): Promise<void> {
  const { data: rows } = await db
    .from('inject_resolution')
    .select('id, seat_id, contact_key, delivered_at, state')
    .eq('session_id', sessionId);
  if (!rows?.length) return;

  const { data: events } = await db
    .from('events')
    .select('seat_id, type, target, ts')
    .eq('session_id', sessionId)
    .in('type', ['message_sent', 'thread_opened', 'call_placed']);
  const ev = events ?? [];

  for (const r of rows as any[]) {
    if (r.state === 'addressed') continue; // terminal
    const key = r.contact_key;
    const t0 = new Date(r.delivered_at).getTime();
    const acted = ev.some(
      (e: any) =>
        e.seat_id === r.seat_id &&
        e.target === key &&
        (e.type === 'message_sent' || e.type === 'call_placed') &&
        new Date(e.ts).getTime() >= t0,
    );
    const opened = ev.some(
      (e: any) => e.seat_id === r.seat_id && e.target === key && e.type === 'thread_opened' && new Date(e.ts).getTime() >= t0,
    );
    const state = acted ? 'addressed' : opened ? 'opened' : 'ignored';
    await db.from('inject_resolution').update({ state, updated_at: new Date().toISOString() }).eq('id', r.id);
  }
}

// Compute + persist a trait-score snapshot from the raw event log (Layer 1 only).
async function scoreAndPersist(db: Db, sessionId: string): Promise<number> {
  const { data: rawEvents } = await db
    .from('events')
    .select('id, session_id, participant_id, seat_id, ts, scenario_ms, type, channel, target, payload_json, derived')
    .eq('session_id', sessionId);
  const events = (rawEvents ?? []) as SpineEvent[];

  const { data: participants } = await db.from('participants').select('id').eq('session_id', sessionId);

  // Re-score: replace this session's snapshot (trait_scores is versioned, not locked).
  await db.from('trait_scores').delete().eq('session_id', sessionId);

  let total = 0;
  for (const p of participants ?? []) {
    const pid = (p as any).id as string;
    const scores = await aiScoreSession(events, { participantId: pid, sessionId });
    const rows = toTraitScoreRows(scores);
    if (rows.length) {
      await db.from('trait_scores').insert(rows);
      total += rows.length;
    }
    // §7 — append this session's scores to the longitudinal profile (the read
    // surface Director-AI / twin / gossip / season depend on).
    await updateProfile(db, sessionId, pid, scores);
  }
  return total;
}

// Append this session's scores to the CROSS-SESSION profile (Phase 9). Resolves the
// person (subject) behind the participant so trajectories accumulate across sessions,
// not just within one — the longitudinal read Director-AI / disposition depend on.
async function updateProfile(db: Db, sessionId: string, participantId: string, scores: any[]): Promise<void> {
  if (!scores.length) return;
  const { data: sess } = await db
    .from('sessions')
    .select('scenario:scenarios!inner(org_id)')
    .eq('id', sessionId)
    .maybeSingle<any>();
  const orgId: string | null = sess?.scenario?.org_id ?? null;

  const subjectId = await subjectForParticipant(db, sessionId, participantId);
  if (!subjectId) return; // anonymous run — no stable identity to accumulate against
  await appendProfile(db, { subjectId, participantId, orgId, sessionId, scores });
}
