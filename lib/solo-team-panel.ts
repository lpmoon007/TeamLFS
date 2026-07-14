import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { deriveTeamMetrics, deriveSeatTierB, type TeamEvent, type SeatRef, type HoldRef, type TeamMetricsResult, type SeatTierB } from '@/lib/team-metrics';
import { PANEL_TAXONOMY, PANEL_SCORER } from '@/lib/panel';
import { recomputePanelNorms } from '@/lib/panel-norms';
import { subjectForParticipant } from '@/lib/spine';
import { resolveAllWeeks } from '@/lib/solo-week';

type Db = ReturnType<typeof createAdminClient>;

// Tier B for a SOLO scenario cast as a team (Reading 1). The team-app adapter is
// injects-shaped; a solo-team run instead emits the Decision-Room catalog (proposal /
// stance / decision_lock) + attributed hold surfacing + the weekly clock as its pressure
// frame. This maps that log into the same Tier-B envelope so deriveTeamMetrics /
// deriveSeatTierB apply unchanged. Holds come from the authored scenario, not
// inject_resolution.

/** Map a solo-team session's log into the Tier-B envelope. Null if not a team-cast run. */
export async function buildSoloTeamStream(
  db: Db,
  sessionId: string,
): Promise<{ stream: TeamEvent[]; holds: HoldRef[]; seats: SeatRef[]; roster: { participantId: string; seatKey: string }[] } | null> {
  const { data: session } = await db.from('sessions').select('id, scenario_id, started_at, run_config').eq('id', sessionId).maybeSingle<any>();
  if (!session || !session.run_config?.team_cast) return null;

  const [{ data: parts }, { data: rawEvents }, { data: contentDoc }, { data: rulings }] = await Promise.all([
    db.from('participants').select('id, cast_kind, seat:seats!inner(key)').eq('session_id', sessionId),
    db.from('events').select('participant_id, ts, scenario_ms, type, target, payload_json').eq('session_id', sessionId).order('ts', { ascending: true }),
    db.from('documents').select('body_json').eq('scenario_id', session.scenario_id).eq('key', 'solo_content').maybeSingle<any>(),
    db.from('rulings').select('branch_key').eq('session_id', sessionId).not('branch_key', 'is', null).order('week_idx', { ascending: false }),
  ]);
  const content = contentDoc?.body_json;
  if (!content) return null;

  const seatByParticipant = new Map<string, string>();
  const seats: SeatRef[] = [];
  const roster: { participantId: string; seatKey: string }[] = [];
  for (const p of (parts ?? []) as any[]) {
    const key = p.seat?.key ?? p.id;
    seatByParticipant.set(p.id, key);
    seats.push({ id: key, ai: p.cast_kind === 'ai' }); // team-cast fills all seats human
    roster.push({ participantId: p.id, seatKey: key });
  }
  const teamKeys = new Set(seats.map((s) => s.id));

  // authored holds for the run's branch → the coverage denominator (collective info to surface)
  const branch: string | null = (rulings ?? [])[0]?.branch_key ?? null;
  const weeks = resolveAllWeeks(content, branch);
  const holds: HoldRef[] = weeks.flatMap((w: any) => (w.holds ?? []).map((h: any) => ({ key: `${w.n}:${h.from}:${h.topic}`, week: w.n })));

  const events = (rawEvents ?? []) as any[];
  const startMs = session.started_at ? new Date(session.started_at).getTime() : events.length ? new Date(events[0].ts).getTime() : 0;
  const at = (e: any) => (typeof e.scenario_ms === 'number' ? e.scenario_ms : new Date(e.ts).getTime() - startMs);

  const stream: TeamEvent[] = [];
  for (const e of events) {
    const p = e.payload_json ?? {};
    const actorKey = e.participant_id ? seatByParticipant.get(e.participant_id) : null;
    if (e.type === 'proposal' && p.optionId) {
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: p.seat ?? actorKey ?? 'system', type: 'proposal', meta: { optionId: p.optionId } });
    } else if (e.type === 'stance' && p.optionId && p.seat) {
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: p.seat, type: 'stance', target: p.optionId, meta: { optionId: p.optionId, valence: Number(p.valence) } });
    } else if (e.type === 'decision_lock' && p.optionId) {
      stream.push({ t: at(e), week: 1, phase: 'decide', actor: p.seat ?? 'system', type: 'decision_lock', target: p.optionId, meta: { optionId: p.optionId } });
    } else if (e.type === 'hold_surfaced') {
      // attributed: the surfacing seat brings their private fact into the room (B4 / coverage)
      const holdKey = `${p.week}:${e.target ?? actorKey}:${p.topic}`;
      stream.push({ t: 1, week: Number(p.week) || 1, phase: 'deliberate', actor: e.target ?? actorKey ?? 'system', type: 'hold_surface', ref: holdKey, meta: { hold: holdKey, route: 'volunteered' } });
    } else if (e.type === 'message_sent' && actorKey && e.target && teamKeys.has(String(e.target))) {
      // a human seat asking a teammate (airtime + closed-loop)
      const chars = Number(p.length ?? (typeof p.body === 'string' ? p.body.length : 0)) || 1;
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: actorKey, type: 'message', target: String(e.target), meta: { chars } });
    } else if (e.type === 'week_started') {
      // the weekly clock is the room's pressure frame — deliberation happens under it
      stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: 'system', type: 'pressure', meta: { severity: 2 } });
    } else if (e.type === 'thread_opened' || e.type === 'email_read') {
      if (actorKey && e.target) stream.push({ t: at(e), week: 1, phase: 'deliberate', actor: actorKey, type: 'read', target: String(e.target), meta: {} });
    }
  }

  return { stream, holds, seats, roster };
}

/** The team board (Tier B) for a solo-team run, for the debrief. Null if not team-cast. */
export async function buildSoloTeamBoard(sessionId: string): Promise<TeamMetricsResult | null> {
  const db = createAdminClient();
  const built = await buildSoloTeamStream(db, sessionId);
  if (!built) return null;
  return deriveTeamMetrics(built.stream, built.holds, built.seats);
}

/** One participant's per-person Tier B for a solo-team run. */
export async function soloTeamSeatTierB(sessionId: string, participantId: string): Promise<SeatTierB | null> {
  const db = createAdminClient();
  const built = await buildSoloTeamStream(db, sessionId);
  if (!built) return null;
  const r = built.roster.find((x) => x.participantId === participantId);
  if (!r) return null;
  return deriveSeatTierB(built.stream, built.seats, r.seatKey);
}

/** Persist per-person Tier B for a solo-team run (mode 'team', so it feeds the divergence
 *  quadrant + team norms exactly like a real team run). Called at the final decision. */
export async function persistSoloTeamPanel(sessionId: string): Promise<void> {
  const db = createAdminClient();
  const built = await buildSoloTeamStream(db, sessionId);
  if (!built) return;
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return;
  const result = deriveTeamMetrics(built.stream, built.holds, built.seats);

  const rows: any[] = [];
  for (const r of built.roster) {
    const seatB = deriveSeatTierB(built.stream, built.seats, r.seatKey);
    const subjectId = await subjectForParticipant(db, sessionId, r.participantId);
    const markers = Object.fromEntries(seatB.markers.map((m) => [m.key, m]));
    rows.push({
      session_id: sessionId,
      participant_id: r.participantId,
      subject_id: subjectId,
      scenario_id: session.scenario_id,
      mode: 'team', // a solo scenario cast as a team contributes to the person's teaming axis
      difficulty: 1,
      markers: markers as any,
      tier_a: null,
      tier_b: seatB.tierB,
      quadrant: 'na',
      provisional: true,
      taxonomy_version: PANEL_TAXONOMY,
      scorer_version: PANEL_SCORER,
    });
  }
  // replace only the team (Tier-B) rows for this session; the solo Tier-A panel row (written
  // by scoreSoloRun under the owner) stays.
  await db.from('behavioral_panel').delete().eq('session_id', sessionId).eq('mode', 'team');
  if (rows.length) await db.from('behavioral_panel').insert(rows);
  try {
    await recomputePanelNorms(db, 'team');
  } catch {
    /* norms are a convenience read */
  }
  void result;
}
