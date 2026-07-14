import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { deriveTeamMetrics, type TeamEvent, type SeatRef, type HoldRef, type TeamMetricsResult } from '@/lib/team-metrics';
import { PANEL_TAXONOMY, PANEL_SCORER } from '@/lib/panel';
import { readNormsMap, readMarkerNorm, recomputePanelNorms } from '@/lib/panel-norms';

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
    db.from('events').select('participant_id, ts, scenario_ms, type, target, payload_json').eq('session_id', sessionId).order('ts', { ascending: true }),
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

  // All team weeks collapse to one act (the room is continuous), so week:1 throughout.
  // t is scenario_ms where the emitter stamped it authoritatively (proposal/stance/
  // decision_lock/pressure), else rel(ts) — both are ms-since-start, one axis.
  const at = (e: any) => (typeof e.scenario_ms === 'number' ? e.scenario_ms : rel(e.ts));
  const stream: TeamEvent[] = [];
  let sawLock = false;
  for (const e of events) {
    const p = e.payload_json ?? {};
    if (e.type === 'message_sent') {
      const seat = e.participant_id ? seatByParticipant.get(e.participant_id) : null;
      if (!seat) continue;
      const chars = Number(p.length ?? (typeof p.body === 'string' ? p.body.length : 0)) || 1;
      stream.push({ t: rel(e.ts), week: 1, phase: 'deliberate', actor: seat.key, type: 'message', target: e.target ?? null, meta: { chars, channel: 'room' } });
    } else if (e.type === 'proposal' && p.optionId) {
      const actor = p.seat ?? (e.participant_id ? seatByParticipant.get(e.participant_id)?.key : null) ?? 'system';
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor, type: 'proposal', meta: { optionId: p.optionId, summary: p.summary } });
    } else if (e.type === 'stance' && p.optionId && p.seat) {
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: p.seat, type: 'stance', target: p.optionId, meta: { optionId: p.optionId, valence: Number(p.valence) } });
    } else if (e.type === 'decision_lock' && p.optionId) {
      sawLock = true;
      stream.push({ t: at(e), week: 1, phase: 'decide', actor: p.seat ?? 'system', type: 'decision_lock', target: p.optionId, meta: { optionId: p.optionId, unanimous: !!p.unanimous, dissenters: p.dissenters ?? [] } });
    } else if (e.type === 'pressure') {
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: 'system', type: 'pressure', meta: { severity: Number(p.severity) || 2 } });
    }
  }

  // holds = injects that required a response (every inject_resolution row); surfaced =
  // those marked 'addressed'. Faithful team analogue of the solo hold-surfacing slice.
  const holds: HoldRef[] = [];
  for (const r of (resolution ?? []) as any[]) {
    holds.push({ key: r.inject_id, week: 1 });
    if (r.state === 'addressed') {
      // Addressed at all during the session → counts as surfaced-in-time. inject_resolution
      // carries no addressed-timestamp, so we stamp early (t=1) rather than guess a time that
      // could fall the wrong side of an early lock. Credit is collective (actor 'system').
      stream.push({ t: 1, week: 1, phase: 'deliberate', actor: 'system', type: 'hold_surface', ref: r.inject_id, meta: { hold: r.inject_id, route: 'volunteered' } });
    }
  }
  // Fallback decision_lock at session end ONLY when the room never locked one itself — the
  // deadline all held info had to beat, so coverage still reads for legacy sessions.
  if (!sawLock) {
    stream.push({ t: Math.max(1, endMs - startMs), week: 1, phase: 'decide', actor: 'system', type: 'decision_lock', meta: {} });
  }

  return { stream, holds, seats };
}

/** The team Tier-B board for a session, with cohort reference ranges overlaid onto each
 *  metric (percentile shown only once the cohort matures). Null if the session is gone. */
export async function buildTeamPanel(sessionId: string): Promise<TeamMetricsResult | null> {
  const db = createAdminClient();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  const built = await buildTeamStream(db, sessionId);
  if (!built) return null;
  const result = deriveTeamMetrics(built.stream, built.holds, built.seats);

  const cohorts = [session?.scenario_id ? `scenario:${session.scenario_id}` : '', 'all'].filter(Boolean);
  const norms = await readNormsMap(db, cohorts);
  for (const m of Object.values(result.metrics)) {
    const norm = readMarkerNorm(norms, cohorts, m.key, m.exercised ? m.score : null);
    if (norm) {
      m.percentile = norm.percentile;
      m.band = { p10: norm.p10, p50: norm.p50, p90: norm.p90 };
      m.cohortN = norm.n;
    }
  }
  return result;
}

/** Persist one team-panel row per session (mode 'team') so Tier-B metrics accumulate into
 *  the cohort ranges, then recompute team norms. Called at finalize. Idempotent per session. */
export async function persistTeamPanel(sessionId: string): Promise<void> {
  const db = createAdminClient();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return;
  // team-mode only — finalize can also run for solo runs, which have no team room.
  const { data: meta } = await db.from('scenario_meta').select('mode_default').eq('scenario_id', session.scenario_id).maybeSingle<any>();
  if (meta?.mode_default === 'solo') return;
  const built = await buildTeamStream(db, sessionId);
  if (!built) return;
  const result = deriveTeamMetrics(built.stream, built.holds, built.seats);

  // markers keyed by metric key so recomputePanelNorms('team') reads them like Tier-A markers.
  const markers: Record<string, any> = {};
  for (const m of Object.values(result.metrics)) {
    markers[m.key] = { key: m.key, label: m.label, tier: 'B', raw: null, normalized: m.score, percentile: null, confidence: 'medium', exercised: m.exercised };
  }

  await db.from('behavioral_panel').delete().eq('session_id', sessionId).is('participant_id', null);
  await db.from('behavioral_panel').insert({
    session_id: sessionId,
    participant_id: null,
    subject_id: null,
    scenario_id: session.scenario_id,
    mode: 'team',
    difficulty: 1,
    markers: markers as any,
    tier_a: null,
    tier_b: result.healthIndex,
    quadrant: 'na',
    provisional: true,
    taxonomy_version: PANEL_TAXONOMY,
    scorer_version: PANEL_SCORER,
  });
  try {
    await recomputePanelNorms(db, 'team');
  } catch {
    /* norms are a convenience read — never fail finalize on them */
  }
}
