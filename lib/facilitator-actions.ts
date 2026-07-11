'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { facilitatorSecret } from '@/lib/env';
import { isFacilitatorSession, setFacilitatorSession, clearFacilitatorSession } from '@/lib/facilitator-session';
import { fireInject } from '@/lib/inject';
import { finalizeSession } from '@/lib/finalize';
import { subjectForParticipant, subjectPosture, resolveDispositionFromHistory } from '@/lib/spine';
import { broadcast } from '@/lib/realtime-server';
import { seatChannel } from '@/lib/channels';
import { runDirector, type DirectorReport } from '@/lib/director';
import { getRubrics, TAXONOMY_VERSION, AI_SCORER_VERSION } from '@/lib/scoring';
import type { TraitScore } from '@/lib/scoring/types';
import { compareScoreSets, aggregateAgreement, type AgreementSummary } from '@/lib/rescore';

/** scorer_version stamped on human-coded rows (distinct from the AI/heuristic coders). */
const HUMAN_SCORER_VERSION = 'human-v1';

// Facilitator dashboard actions (Phase 8). All guarded by the facilitator cookie.

export async function facilitatorLogin(key: string): Promise<{ ok: boolean }> {
  let secret = '';
  try {
    secret = facilitatorSecret();
  } catch {
    return { ok: false };
  }
  if (!key || key !== secret) return { ok: false };
  await setFacilitatorSession();
  return { ok: true };
}

export async function facilitatorLogout(): Promise<void> {
  await clearFacilitatorSession();
}

async function guard() {
  if (!(await isFacilitatorSession())) throw new Error('unauthorized');
  return createAdminClient();
}

export interface SessionSummary {
  id: string;
  status: string;
  scenario: string;
  mode: 'solo' | 'team';
  started_at: string | null;
  ended_at: string | null;
  participants: number;
  present: number;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const db = await guard();
  const { data: sessions } = await db
    .from('sessions')
    .select('id, status, scenario_id, started_at, ended_at, scenario:scenarios!inner(title)')
    .order('created_at', { ascending: false });
  const ids = (sessions ?? []).map((s: any) => s.id);
  const counts = new Map<string, { total: number; present: number }>();
  if (ids.length) {
    const { data: parts } = await db.from('participants').select('session_id, present').in('session_id', ids);
    for (const p of parts ?? []) {
      const c = counts.get((p as any).session_id) ?? { total: 0, present: 0 };
      c.total++;
      if ((p as any).present) c.present++;
      counts.set((p as any).session_id, c);
    }
  }
  // mode per scenario (solo runs get the solo console + solo debrief)
  const scnIds = [...new Set((sessions ?? []).map((s: any) => s.scenario_id))];
  const modeByScenario = new Map<string, 'solo' | 'team'>();
  if (scnIds.length) {
    const { data: metas } = await db.from('scenario_meta').select('scenario_id, mode_default').in('scenario_id', scnIds);
    for (const m of metas ?? []) modeByScenario.set((m as any).scenario_id, (m as any).mode_default);
  }
  return (sessions ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    scenario: s.scenario?.title ?? '—',
    mode: modeByScenario.get(s.scenario_id) ?? 'team',
    started_at: s.started_at,
    ended_at: s.ended_at,
    participants: counts.get(s.id)?.total ?? 0,
    present: counts.get(s.id)?.present ?? 0,
  }));
}

// =============================================================================
// Phase 8 — solo-run console. A solo session's control surface differs from a
// team's: there are no NPC contacts to hand-drive, no per-seat injects to fire
// manually — the run is one human CEO + AI advisor seats against the real-time
// weeks. What the facilitator controls is the run-level DISPOSITION dial (A3.2)
// and casting the advisor seats; what they watch is the per-week ruling trail,
// the driver world-model, and the live event log.
// =============================================================================

export interface SoloAdvisor {
  seatKey: string;
  name: string;
  role: string | null;
  castKind: 'human' | 'ai';
}
export interface SoloRulingRow {
  weekIdx: number | null;
  decision: string | null;
  dims: Record<string, number>;
  branch: string | null;
  buzzer: boolean;
}
export interface SoloHistory {
  sessions: number; // prior sessions in this person's spine
  resolvedDisposition: 'served' | 'request' | 'guarded';
  resolvedFromHistory: boolean;
  score: number | null;
  traits: { trait_key: string; mean: number }[];
}
export interface SoloControlData {
  session: { id: string; status: string; scenario: string; scenarioId: string } | null;
  disposition: string;
  dispositions: { key: string; label: string; tag: string | null }[];
  weekCount: number | null;
  ceo: { seatKey: string; name: string; present: boolean; token: string | null } | null;
  advisors: SoloAdvisor[];
  drivers: { key: string; label: string; value: number }[];
  rulings: SoloRulingRow[];
  history: SoloHistory | null;
}

/** Solo or team? (drives which console + debrief the facilitator sees.) */
export async function sessionMode(sessionId: string): Promise<'solo' | 'team' | null> {
  const db = await guard();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return null;
  const { data: meta } = await db.from('scenario_meta').select('mode_default').eq('scenario_id', session.scenario_id).maybeSingle<any>();
  return (meta?.mode_default ?? 'team') as 'solo' | 'team';
}

export async function loadSoloControl(sessionId: string): Promise<SoloControlData> {
  const db = await guard();
  const empty: SoloControlData = { session: null, disposition: 'request', dispositions: [], weekCount: null, ceo: null, advisors: [], drivers: [], rulings: [], history: null };

  const { data: session } = await db
    .from('sessions')
    .select('id, status, scenario_id, run_config, scenario:scenarios!inner(title)')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return empty;

  const [{ data: meta }, { data: contentDoc }, { data: parts }, { data: rulings }, { data: driverRows }] = await Promise.all([
    db.from('scenario_meta').select('mode_default, driver_keys, week_count').eq('scenario_id', session.scenario_id).maybeSingle<any>(),
    db.from('documents').select('body_json').eq('scenario_id', session.scenario_id).eq('key', 'solo_content').maybeSingle<any>(),
    db.from('participants').select('id, present, cast_kind, token, seat:seats!inner(key, name, role)').eq('session_id', sessionId),
    db.from('rulings').select('week_idx, decision_text, dimension_scores, branch_key, buzzer').eq('session_id', sessionId).order('week_idx', { ascending: true }),
    db.from('run_drivers').select('week_idx, driver_key, value').eq('session_id', sessionId).order('week_idx', { ascending: false }),
  ]);

  const content = contentDoc?.body_json ?? {};
  const DRIVERS = content.DRIVERS ?? {};

  // CEO hot seat = the human occupant; the rest are advisor seats.
  const rows = (parts ?? []) as any[];
  const ceoRow = rows.find((p) => p.cast_kind === 'human') ?? rows.find((p) => p.seat?.key === 'ceo');
  const advisors: SoloAdvisor[] = rows
    .filter((p) => p !== ceoRow)
    .map((p) => ({ seatKey: p.seat?.key, name: p.seat?.name ?? p.seat?.key, role: p.seat?.role ?? null, castKind: (p.cast_kind ?? 'ai') as 'human' | 'ai' }));

  // current driver values: latest week's value per key (rows ordered week desc)
  const latest: Record<string, number> = {};
  for (const r of (driverRows ?? []) as any[]) if (latest[r.driver_key] === undefined && r.value !== null) latest[r.driver_key] = Number(r.value);
  const drivers = Object.keys(DRIVERS).map((k) => ({ key: k, label: DRIVERS[k].label ?? k, value: latest[k] ?? DRIVERS[k].val ?? 0 }));

  const dispositions = Object.entries(content.DISPOSITIONS ?? {}).map(([key, d]: [string, any]) => ({ key, label: d.label ?? key, tag: d.tag ?? null }));

  // Phase 9 — the cross-session read: what disposition this CEO has EARNED from prior
  // runs, and the postures behind it. Excludes the current session's own scores unless
  // it's already been scored (final decision made).
  let history: SoloHistory | null = null;
  if (ceoRow) {
    const subjectId = await subjectForParticipant(db, sessionId, ceoRow.id);
    if (subjectId) {
      const posture = await subjectPosture(db, subjectId);
      const resolved = await resolveDispositionFromHistory(db, subjectId);
      history = {
        sessions: posture.sessions,
        resolvedDisposition: resolved.disposition,
        resolvedFromHistory: resolved.resolvedFromHistory,
        score: resolved.score,
        traits: posture.traits.filter((t) => Math.abs(t.mean) > 0.05).map((t) => ({ trait_key: t.trait_key, mean: t.mean })),
      };
    }
  }

  return {
    session: { id: session.id, status: session.status, scenario: session.scenario?.title ?? '—', scenarioId: session.scenario_id },
    disposition: session.run_config?.disposition ?? 'request',
    dispositions,
    weekCount: meta?.week_count ?? null,
    ceo: ceoRow ? { seatKey: ceoRow.seat?.key, name: ceoRow.seat?.name ?? ceoRow.seat?.key, present: !!ceoRow.present, token: ceoRow.token ?? null } : null,
    advisors,
    drivers,
    rulings: ((rulings ?? []) as any[]).map((r) => ({
      weekIdx: r.week_idx,
      decision: r.decision_text ?? null,
      dims: r.dimension_scores ?? {},
      branch: r.branch_key ?? null,
      buzzer: !!r.buzzer,
    })),
    history,
  };
}

/** Set the run-level disposition dial (A3.2) on a solo session. */
export async function setSoloDisposition(sessionId: string, disposition: string): Promise<{ ok: boolean; disposition?: string }> {
  const db = await guard();
  const { data: session } = await db.from('sessions').select('run_config').eq('id', sessionId).maybeSingle<any>();
  if (!session) return { ok: false };
  const run_config = { ...(session.run_config ?? {}), disposition };
  await db.from('sessions').update({ run_config }).eq('id', sessionId);
  await db.from('events').insert({
    session_id: sessionId,
    type: 'disposition_set',
    channel: 'system',
    target: null,
    payload_json: { disposition },
  });
  return { ok: true, disposition };
}

export interface RosterRow {
  participantId: string;
  seatKey: string;
  name: string;
  role: string | null;
  present: boolean;
  castKind: 'human' | 'ai';
  callableContacts: { key: string; full: string }[];
}

export async function loadControl(sessionId: string): Promise<{
  session: { id: string; status: string; scenario: string; scenarioId: string } | null;
  roster: RosterRow[];
}> {
  const db = await guard();
  const { data: session } = await db
    .from('sessions')
    .select('id, status, scenario_id, scenario:scenarios!inner(title)')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return { session: null, roster: [] };

  const { data: parts } = await db
    .from('participants')
    .select('id, present, cast_kind, seat:seats!inner(id, key, name, role)')
    .eq('session_id', sessionId);

  const { data: contacts } = await db
    .from('contacts')
    .select('key, full, seat_id, callable')
    .eq('scenario_id', session.scenario_id)
    .eq('callable', true);

  const roster: RosterRow[] = (parts ?? []).map((p: any) => ({
    participantId: p.id,
    seatKey: p.seat?.key,
    name: p.seat?.name ?? p.seat?.key,
    role: p.seat?.role ?? null,
    present: p.present,
    castKind: (p.cast_kind ?? 'human') as 'human' | 'ai',
    callableContacts: (contacts ?? [])
      .filter((c: any) => c.seat_id === p.seat?.id || c.seat_id === null)
      .map((c: any) => ({ key: c.key, full: c.full })),
  }));

  return {
    session: { id: session.id, status: session.status, scenario: session.scenario?.title ?? '—', scenarioId: session.scenario_id },
    roster,
  };
}

export interface InjectRow {
  id: string;
  seat: string | null;
  kind: string;
  thread: string | null;
  delay_min: number | null;
  cond: string | null;
  trigger: number | null;
  preview: string;
}

export async function listInjects(sessionId: string): Promise<InjectRow[]> {
  const db = await guard();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return [];
  const { data: injects } = await db
    .from('injects')
    .select('id, seat_id, kind, payload_json, order_idx')
    .eq('scenario_id', session.scenario_id)
    .order('order_idx', { ascending: true });
  const { data: seats } = await db.from('seats').select('id, key').eq('scenario_id', session.scenario_id);
  const seatKey = new Map((seats ?? []).map((s: any) => [s.id, s.key]));
  return (injects ?? []).map((i: any) => ({
    id: i.id,
    seat: i.seat_id ? seatKey.get(i.seat_id) ?? null : null,
    kind: i.kind,
    thread: i.payload_json?.thread ?? i.payload_json?.contact_key ?? null,
    delay_min: i.payload_json?.delay_min ?? null,
    cond: i.payload_json?.cond ?? null,
    trigger: i.payload_json?.propagation_trigger ?? null,
    preview: String(i.payload_json?.body ?? i.payload_json?.text ?? '').slice(0, 140),
  }));
}

export async function fireInjectFac(sessionId: string, injectId: string, force: boolean): Promise<any> {
  await guard();
  return fireInject(sessionId, injectId, { force });
}

// ---- Director-AI controls (Horizon 1) --------------------------------------

export interface DirectorConfig {
  enabled: boolean;
  ai: boolean;
}

/** Read the session's Director config (off by default — manual firing stands). */
export async function loadDirectorConfig(sessionId: string): Promise<DirectorConfig> {
  const db = await guard();
  const { data } = await db.from('sessions').select('run_config').eq('id', sessionId).maybeSingle<any>();
  const d = data?.run_config?.director ?? {};
  return { enabled: !!d.enabled, ai: !!d.ai };
}

/** Enable/disable the Director and its AI layer for a session (run_config.director). */
export async function setDirectorConfig(sessionId: string, cfg: DirectorConfig): Promise<{ ok: boolean }> {
  const db = await guard();
  const { data: session } = await db.from('sessions').select('run_config').eq('id', sessionId).maybeSingle<any>();
  if (!session) return { ok: false };
  const run_config = { ...(session.run_config ?? {}), director: { enabled: !!cfg.enabled, ai: !!cfg.ai } };
  await db.from('sessions').update({ run_config }).eq('id', sessionId);
  return { ok: true };
}

/** Run one Director tick from the console (dryRun previews; live fires). */
export async function runDirectorFac(sessionId: string, opts: { dryRun?: boolean; ai?: boolean }): Promise<DirectorReport> {
  await guard();
  return runDirector(sessionId, { dryRun: opts.dryRun, useAI: opts.ai });
}

export async function finalizeFac(sessionId: string): Promise<any> {
  await guard();
  return finalizeSession(sessionId);
}

export interface FeedEvent {
  id: string;
  seat: string | null;
  type: string;
  channel: string | null;
  target: string | null;
  at: string;
  derived: boolean;
  preview: string | null;
}

export async function recentEvents(sessionId: string, limit = 60): Promise<FeedEvent[]> {
  const db = await guard();
  const { data } = await db
    .from('events')
    .select('id, type, channel, target, ts, derived, payload_json, seat:seats(key)')
    .eq('session_id', sessionId)
    .order('ts', { ascending: false })
    .limit(limit);
  return (data ?? []).map((e: any) => ({
    id: e.id,
    seat: e.seat?.key ?? null,
    type: e.type,
    channel: e.channel,
    target: e.target,
    at: e.ts,
    derived: e.derived,
    preview: previewOf(e.payload_json),
  }));
}

/** Hand-drive an NPC: deliver a message as `contactKey` to `seatKey`'s thread. */
export async function sendAsNpc(params: {
  sessionId: string;
  seatKey: string;
  contactKey: string;
  body: string;
}): Promise<{ ok: boolean }> {
  const db = await guard();
  const body = params.body.trim();
  if (!body) return { ok: false };

  const { data: session } = await db.from('sessions').select('scenario_id, status').eq('id', params.sessionId).maybeSingle<any>();
  if (!session || session.status !== 'live') return { ok: false };

  const { data: seat } = await db
    .from('seats')
    .select('id')
    .eq('scenario_id', session.scenario_id)
    .eq('key', params.seatKey)
    .maybeSingle<{ id: string }>();
  if (!seat) return { ok: false };

  const { data: participant } = await db
    .from('participants')
    .select('id')
    .eq('session_id', params.sessionId)
    .eq('seat_id', seat.id)
    .maybeSingle<{ id: string }>();

  const { data: contact } = await db
    .from('contacts')
    .select('callable')
    .eq('scenario_id', session.scenario_id)
    .eq('key', params.contactKey)
    .limit(1)
    .maybeSingle<{ callable: boolean }>();
  const sender = contact?.callable ? 'npc' : 'system';

  const { data: thread } = await db
    .from('threads')
    .upsert(
      { session_id: params.sessionId, seat_id: seat.id, contact_key: params.contactKey, is_group: false },
      { onConflict: 'session_id,seat_id,contact_key' },
    )
    .select('id')
    .single<{ id: string }>();
  if (!thread) return { ok: false };

  const { data: msg } = await db
    .from('messages')
    .insert({ thread_id: thread.id, sender, body })
    .select('id, sent_at')
    .single<any>();

  await broadcast(seatChannel(params.sessionId, params.seatKey), 'message', {
    id: msg?.id,
    thread_id: thread.id,
    contact_key: params.contactKey,
    sender,
    body,
    sent_at: msg?.sent_at,
  });

  // Capture as a delivered stimulus (hand-driven), so behavior stays attributable.
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: participant?.id ?? null,
    seat_id: seat.id,
    type: 'inject_delivered',
    channel: 'message',
    target: params.contactKey,
    payload_json: { hand_driven: true, preview: body.slice(0, 140) },
  });

  return { ok: true };
}

/**
 * Phase 6 — cast a seat's occupant human ↔ AI (Roadmap Horizon 0: every seat
 * Human-or-AI). Casting to AI writes `agent_json` (persona/priority/model) so the
 * AI-seat driver can play it, and nulls the magic-link token. The recast itself is
 * logged as a system event so the run's casting history is auditable.
 */
export async function castSeat(params: {
  sessionId: string;
  seatKey: string;
  kind: 'human' | 'ai';
  persona?: string;
  priority?: string;
}): Promise<{ ok: boolean; castKind?: 'human' | 'ai' }> {
  const db = await guard();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', params.sessionId).maybeSingle<any>();
  if (!session) return { ok: false };

  const { data: seat } = await db
    .from('seats')
    .select('id, name, role')
    .eq('scenario_id', session.scenario_id)
    .eq('key', params.seatKey)
    .maybeSingle<any>();
  if (!seat) return { ok: false };

  const { data: participant } = await db
    .from('participants')
    .select('id')
    .eq('session_id', params.sessionId)
    .eq('seat_id', seat.id)
    .maybeSingle<{ id: string }>();
  if (!participant) return { ok: false };

  if (params.kind === 'ai') {
    const agent_json = {
      name: seat.name ?? params.seatKey,
      role: seat.role ?? null,
      // A concrete persona is best supplied at cast time; absent one we ground the
      // agent in its own seat identity so it still plays in character.
      persona: (params.persona ?? '').trim() || `You are the ${seat.role ?? seat.name ?? params.seatKey} on this leadership team. Speak from that seat's expertise and stakes.`,
      priority: (params.priority ?? '').trim() || null,
      autonomy: 'reactive', // replies when addressed; proactive acting is a later dial
    };
    await db.from('participants').update({ cast_kind: 'ai', agent_json, token: null }).eq('id', participant.id);
  } else {
    await db.from('participants').update({ cast_kind: 'human', agent_json: {} }).eq('id', participant.id);
  }

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: participant.id,
    seat_id: seat.id,
    type: 'seat_recast',
    channel: 'system',
    target: params.seatKey,
    payload_json: { cast_kind: params.kind },
  });

  return { ok: true, castKind: params.kind };
}

// =============================================================================
// Human coding surface (Behavioral Memory Spine §3.3). A trained human coder scores
// a participant's traits from the SAME cited Layer-1 evidence the AI coder read, as
// coder='human' rows. Then the re-score harness's generic compare gives real AI-vs-
// human inter-rater reliability — the number that lets a trait's status flip from
// 'hypothesis' to 'validated'. The coder works BLIND (the AI's answer is hidden until
// they've submitted) so agreement isn't inflated by anchoring.
// =============================================================================

export interface CodingEvidence {
  id: string;
  type: string;
  channel: string | null;
  target: string | null;
  body: string | null;
  derived: boolean;
}
export interface CodingTrait {
  trait_key: string;
  definition: string;
  observable_signals: string[];
  status: string;
  poles: { positive: string; negative: string; neutral: string };
  evidence: CodingEvidence[];
  ai: { value: string | null; value_num: number | null; confidence: number; scorer_version: string } | null;
  human: { value: string | null; value_num: number | null; confidence: number; note: string | null } | null;
}
export interface CodingTask {
  session: { id: string; scenario: string } | null;
  participant: { id: string; seatKey: string; name: string; role: string | null } | null;
  roster: { participantId: string; seatKey: string; name: string }[];
  traits: CodingTrait[];
  reliability: ReliabilityReport | null; // session-wide AI-vs-human agreement so far
}

export async function loadCodingTask(sessionId: string, participantId: string): Promise<CodingTask> {
  const db = await guard();
  const empty: CodingTask = { session: null, participant: null, roster: [], traits: [], reliability: null };

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario:scenarios!inner(title)')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return empty;

  const { data: parts } = await db
    .from('participants')
    .select('id, seat:seats!inner(key, name, role)')
    .eq('session_id', sessionId);
  const roster = (parts ?? []).map((p: any) => ({ participantId: p.id, seatKey: p.seat?.key, name: p.seat?.name ?? p.seat?.key }));
  const me = (parts ?? []).find((p: any) => p.id === participantId) as any;
  if (!me) return { ...empty, session: { id: session.id, scenario: session.scenario?.title ?? '—' }, roster };

  const { data: scores } = await db
    .from('trait_scores')
    .select('trait_key, value, value_num, confidence, scorer_version, coder, evidence_event_ids, note, created_at')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false });
  const rows = (scores ?? []) as any[];
  // latest AI/heuristic (coder='ai') and latest human row per trait
  const aiByTrait = new Map<string, any>();
  const humanByTrait = new Map<string, any>();
  for (const r of rows) {
    const m = r.coder === 'human' ? humanByTrait : aiByTrait;
    if (!m.has(r.trait_key)) m.set(r.trait_key, r);
  }

  // resolve cited evidence for the trait (what the coder judges) — from the AI row.
  const allEvidenceIds = [...new Set(rows.flatMap((r) => (r.coder !== 'human' ? r.evidence_event_ids ?? [] : [])))] as string[];
  const evById = new Map<string, CodingEvidence>();
  if (allEvidenceIds.length) {
    const { data: evs } = await db
      .from('events')
      .select('id, type, channel, target, payload_json, derived')
      .in('id', allEvidenceIds);
    for (const e of (evs ?? []) as any[]) {
      evById.set(e.id, { id: e.id, type: e.type, channel: e.channel, target: e.target, body: previewOf(e.payload_json), derived: e.derived });
    }
  }

  const traits: CodingTrait[] = getRubrics().map((r) => {
    const ai = aiByTrait.get(r.trait_key);
    const human = humanByTrait.get(r.trait_key);
    const evidenceIds = (ai?.evidence_event_ids ?? []) as string[];
    return {
      trait_key: r.trait_key,
      definition: r.definition,
      observable_signals: r.observable_signals,
      status: r.status,
      poles: r.poles,
      evidence: evidenceIds.map((id) => evById.get(id)).filter((e): e is CodingEvidence => !!e),
      ai: ai ? { value: ai.value, value_num: ai.value_num, confidence: ai.confidence, scorer_version: ai.scorer_version } : null,
      human: human ? { value: human.value, value_num: human.value_num, confidence: human.confidence, note: (human as any).note ?? null } : null,
    };
  });

  return {
    session: { id: session.id, scenario: session.scenario?.title ?? '—' },
    participant: { id: me.id, seatKey: me.seat?.key, name: me.seat?.name ?? me.seat?.key, role: me.seat?.role ?? null },
    roster,
    traits,
    reliability: await coderReliability(sessionId),
  };
}

/** Save a human coder's judgment for one trait (replaces any prior human row for it).
 *  The pole (value) is derived from value_num exactly as the scorers do, so AI-vs-human
 *  agreement is apples-to-apples. The human cites the same evidence the AI did. */
export async function submitHumanScore(params: {
  sessionId: string;
  participantId: string;
  traitKey: string;
  valueNum: number;
  confidence: number;
  note?: string;
}): Promise<{ ok: boolean }> {
  const db = await guard();
  const rubric = getRubrics().find((r) => r.trait_key === params.traitKey);
  if (!rubric) return { ok: false };

  const valueNum = Math.max(-1, Math.min(1, Number(params.valueNum)));
  const confidence = Math.max(0, Math.min(1, Number(params.confidence)));
  const value = confidence === 0 ? null : valueNum > 0.2 ? rubric.poles.positive : valueNum < -0.2 ? rubric.poles.negative : rubric.poles.neutral;

  // the evidence the human judged = what the AI cited for this trait
  const { data: aiRow } = await db
    .from('trait_scores')
    .select('evidence_event_ids')
    .eq('session_id', params.sessionId)
    .eq('participant_id', params.participantId)
    .eq('trait_key', params.traitKey)
    .neq('coder', 'human')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<any>();

  // replace any prior human row for this trait (current judgment, not history)
  await db
    .from('trait_scores')
    .delete()
    .eq('session_id', params.sessionId)
    .eq('participant_id', params.participantId)
    .eq('trait_key', params.traitKey)
    .eq('coder', 'human');

  await db.from('trait_scores').insert({
    participant_id: params.participantId,
    session_id: params.sessionId,
    taxonomy_version: TAXONOMY_VERSION,
    scorer_version: HUMAN_SCORER_VERSION,
    trait_key: params.traitKey,
    value,
    value_num: confidence === 0 ? null : valueNum,
    confidence,
    evidence_event_ids: aiRow?.evidence_event_ids ?? [],
    coder: 'human',
    note: (params.note ?? '').trim() || null,
  } as any);

  return { ok: true };
}

export interface ReliabilityReport {
  ok: boolean;
  aRows: number;
  bRows: number;
  agreement: AgreementSummary | null;
}

/** AI-vs-human inter-rater reliability for a session, from the stored trait_scores.
 *  Coder A = the AI/heuristic snapshot (prefer AI rows), Coder B = human rows. */
export async function coderReliability(sessionId: string): Promise<ReliabilityReport> {
  const db = await guard();
  const { data: scores } = await db
    .from('trait_scores')
    .select('participant_id, trait_key, value, value_num, confidence, scorer_version, coder, evidence_event_ids, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  const rows = (scores ?? []) as any[];

  const asTS = (r: any): TraitScore => ({
    participant_id: r.participant_id,
    session_id: sessionId,
    taxonomy_version: TAXONOMY_VERSION,
    scorer_version: r.scorer_version,
    trait_key: r.trait_key,
    value: r.value,
    value_num: r.value_num,
    confidence: r.confidence,
    evidence_event_ids: r.evidence_event_ids ?? [],
    coder: r.coder,
  });

  // per participant: coder A (prefer AI over heuristic), coder B (human)
  const pids = [...new Set(rows.map((r) => r.participant_id))];
  const comparisons = [];
  let aRows = 0;
  let bRows = 0;
  for (const pid of pids) {
    const mine = rows.filter((r) => r.participant_id === pid);
    const aByTrait = new Map<string, any>();
    for (const r of mine.filter((r) => r.coder !== 'human')) {
      const cur = aByTrait.get(r.trait_key);
      // prefer the AI-versioned row over the heuristic one
      if (!cur || (r.scorer_version === AI_SCORER_VERSION && cur.scorer_version !== AI_SCORER_VERSION)) aByTrait.set(r.trait_key, r);
    }
    const bByTrait = new Map<string, any>();
    for (const r of mine.filter((r) => r.coder === 'human')) if (!bByTrait.has(r.trait_key)) bByTrait.set(r.trait_key, r);
    const a = [...aByTrait.values()].map(asTS);
    const b = [...bByTrait.values()].map(asTS);
    aRows += a.length;
    bRows += b.length;
    if (a.length && b.length) comparisons.push(...compareScoreSets(a, b));
  }

  return { ok: true, aRows, bRows, agreement: comparisons.length ? aggregateAgreement(comparisons) : null };
}

function previewOf(payload: any): string | null {
  const b = payload?.body ?? payload?.text ?? payload?.preview ?? payload?.edited_text ?? null;
  return b ? String(b).slice(0, 100) : null;
}
