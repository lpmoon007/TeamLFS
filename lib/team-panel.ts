import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { deriveTeamMetrics, type TeamEvent, type SeatRef, type HoldRef, type TeamMetricsResult } from '@/lib/team-metrics';

type Db = ReturnType<typeof createAdminClient>;

// Team Behavioral Panel — Tier B (the team-as-one board). This is the ADAPTER that maps
// the LOCKED events log into the Tier-B envelope (Team Event-Log Spec §1), then runs the
// single, spec-verbatim deriveTeamMetrics over it.
//
// Honesty rule (Spec §2, §7 handoff): we emit ONLY the events the current team app truly
// produces — `message` (airtime) and `hold_surface` + a synthetic session-end
// `decision_lock` (coverage). We deliberately DO NOT fabricate `pressure`/`proposal`/
// `stance`, so resilience + safety report *not exercised* rather than a misleading 0.
// Those come online when the room grows real deliberation affordances.

/** Build the Tier-B stream + holds + seat roster for a team session from the real log. */
async function buildTeamStream(db: Db, sessionId: string): Promise<{ stream: TeamEvent[]; holds: HoldRef[]; seats: SeatRef[] } | null> {
  const { data: session } = await db.from('sessions').select('id, started_at, ended_at').eq('id', sessionId).maybeSingle<any>();
  if (!session) return null;

  const [{ data: parts }, { data: rawEvents }, { data: resolution }] = await Promise.all([
    db.from('participants').select('id, cast_kind, seat:seats!inner(key)').eq('session_id', sessionId),
    db.from('events').select('participant_id, ts, type, target, payload_json').eq('session_id', sessionId).order('ts', { ascending: true }),
    db.from('inject_resolution').select('seat_id, inject_id, state').eq('session_id', sessionId),
  ]);

  const seatByParticipant = new Map<string, { key: string; ai: boolean }>();
  const seats: SeatRef[] = [];
  for (const p of (parts ?? []) as any[]) {
    const key = p.seat?.key ?? p.id;
    const ai = p.cast_kind === 'ai';
    seatByParticipant.set(p.id, { key, ai });
    seats.push({ id: key, ai });
  }

  const events = (rawEvents ?? []) as any[];
  const startMs = session.started_at ? new Date(session.started_at).getTime() : events.length ? new Date(events[0].ts).getTime() : 0;
  const endMs = session.ended_at ? new Date(session.ended_at).getTime() : events.length ? new Date(events[events.length - 1].ts).getTime() : startMs;
  const rel = (ts: string) => new Date(ts).getTime() - startMs;

  const stream: TeamEvent[] = [];
  // message events → airtime. All team weeks collapse to one act (the room is continuous),
  // so week:1 throughout; the single decision_lock below is the deadline coverage beats.
  for (const e of events) {
    if (e.type !== 'message_sent') continue;
    const seat = e.participant_id ? seatByParticipant.get(e.participant_id) : null;
    if (!seat) continue;
    const chars = Number(e.payload_json?.length ?? (typeof e.payload_json?.body === 'string' ? e.payload_json.body.length : 0)) || 1;
    stream.push({ t: rel(e.ts), week: 1, phase: 'deliberate', actor: seat.key, type: 'message', target: e.target ?? null, meta: { chars, channel: 'room' } });
  }

  // holds = injects that required a response (every inject_resolution row); surfaced =
  // those marked 'addressed'. Faithful team analogue of the solo hold-surfacing slice.
  const holds: HoldRef[] = [];
  for (const r of (resolution ?? []) as any[]) {
    holds.push({ key: r.inject_id, week: 1 });
    if (r.state === 'addressed') {
      // surfaced before the deadline (session end) → in-time. Credit is collective, so
      // actor is 'system' here; the per-seat surfacing act is a later-instrumentation gain.
      stream.push({ t: Math.max(0, endMs - startMs - 1), week: 1, phase: 'deliberate', actor: 'system', type: 'hold_surface', ref: r.inject_id, meta: { hold: r.inject_id, route: 'volunteered' } });
    }
  }
  // one synthetic decision_lock at session end — the deadline all held info had to beat.
  stream.push({ t: Math.max(1, endMs - startMs), week: 1, phase: 'decide', actor: 'system', type: 'decision_lock', meta: {} });

  return { stream, holds, seats };
}

/** The team Tier-B board for a session. Returns null if the session doesn't exist. */
export async function buildTeamPanel(sessionId: string): Promise<TeamMetricsResult | null> {
  const db = createAdminClient();
  const built = await buildTeamStream(db, sessionId);
  if (!built) return null;
  return deriveTeamMetrics(built.stream, built.holds, built.seats);
}
