import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveWeek } from '@/lib/solo-week';
import { resolveDispositionFromHistory, subjectForParticipant } from '@/lib/spine';

// Solo read path (Master Handoff §7.2). Renders a scenario week from the DB: the
// situation, the trickled feed, the cast rail, the driver HUD — all read from the
// authored content (documents:solo_content) + scenario_meta + the advisor seats.
// No AI, no clock yet (Phases 3-4).

export interface SoloDriver {
  key: string;
  label: string;
  val: number;
  min: number;
  max: number;
}
export interface SoloFeedItem {
  from: string;
  day: number | null;
  kind: string | null; // signal | noise (internal; not shown to the player)
  text: string;
}
export interface SoloCastMember {
  seatKey: string;
  name: string;
  role: string | null;
  short: string | null;
  initials: string | null;
  color: string | null;
  priority: string | null;
}
export interface SoloSurprise {
  day: number;
  from: string;
  kind: string | null;
  title: string | null;
  text: string;
}
export interface SoloWeek {
  n: number;
  title: string;
  seconds: number | null; // this week's real-time length (overrides config.weekSeconds)
  situation: string;
  advocacy: Record<string, string>;
  feed: SoloFeedItem[];
  surprises: SoloSurprise[];
  pulse: { from: string; text: string } | null;
  wire: string[];
}
export interface SoloConfig {
  days: number;
  weekSeconds: number;
  extraDaysPerReprieve: number;
  lowTimeDays: number;
}
export interface SoloBundle {
  sessionId: string;
  seatKey: string;
  token: string;
  participantId: string;
  scenarioTitle: string;
  company: { name: string; sub?: string; logo?: string };
  intro: Record<string, unknown>;
  weekCount: number;
  weekIdx: number;
  drivers: SoloDriver[];
  dimensions: Record<string, string>;
  cast: SoloCastMember[];
  week: SoloWeek;
  config: SoloConfig;
  reprieveCost: Record<string, number>;
  disposition: string;
  lastDeltas: Record<string, number>; // last decided week's driver deltas (empty on week 1)
}

export type SoloResult =
  | { ok: true; bundle: SoloBundle }
  | { ok: false; reason: 'not_found' | 'invalid_token' | 'not_solo' | 'no_content' };

export async function loadSolo(sessionId: string, token: string | undefined, weekIdx = 0): Promise<SoloResult> {
  const db = createAdminClient();

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, status, run_config')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return { ok: false, reason: 'not_found' };
  if (!token) return { ok: false, reason: 'invalid_token' };

  const { data: participant } = await db
    .from('participants')
    .select('id, seat_id, token, seat:seats!inner(key)')
    .eq('session_id', sessionId)
    .eq('token', token)
    .maybeSingle<any>();
  if (!participant) return { ok: false, reason: 'invalid_token' };

  const { data: meta } = await db
    .from('scenario_meta')
    .select('mode_default, driver_keys, week_count')
    .eq('scenario_id', session.scenario_id)
    .maybeSingle<any>();
  if (!meta || meta.mode_default !== 'solo') return { ok: false, reason: 'not_solo' };

  const [{ data: scenario }, { data: contentDoc }, { data: seats }, { data: branchRulings }, { data: driverRows }] = await Promise.all([
    db.from('scenarios').select('title').eq('id', session.scenario_id).maybeSingle<any>(),
    db.from('documents').select('body_json').eq('scenario_id', session.scenario_id).eq('key', 'solo_content').maybeSingle<any>(),
    db.from('seats').select('key, name, role, meta').eq('scenario_id', session.scenario_id),
    db.from('rulings').select('branch_key').eq('session_id', sessionId).eq('participant_id', participant.id).not('branch_key', 'is', null).order('week_idx', { ascending: false }),
    db.from('run_drivers').select('week_idx, driver_key, value, delta').eq('session_id', sessionId).eq('participant_id', participant.id).order('week_idx', { ascending: false }),
  ]);
  const content = contentDoc?.body_json;
  if (!content) return { ok: false, reason: 'no_content' };

  const weeks: any[] = content.WEEKS ?? [];
  const idx = Math.max(0, Math.min(weeks.length - 1, weekIdx));
  // resolve a branched week (e.g. Week-4 held/caved) against this run's decided branch
  const branchKey: string | null = (branchRulings ?? [])[0]?.branch_key ?? null;
  const w = resolveWeek(content, idx, branchKey) ?? {};

  // carry driver state across weeks: latest value per key + the most recent week's
  // deltas (so the cockpit shows "how the world moved" persistently, and week N starts
  // where week N-1 ended rather than at the base values).
  const rows = (driverRows ?? []) as any[];
  const latestVal: Record<string, number> = {};
  const lastDeltas: Record<string, number> = {};
  const lastWeek = rows.length ? rows[0].week_idx : null;
  for (const r of rows) {
    if (latestVal[r.driver_key] === undefined && r.value !== null) latestVal[r.driver_key] = Number(r.value);
    if (r.week_idx === lastWeek && r.delta !== null) lastDeltas[r.driver_key] = Number(r.delta);
  }

  const drivers: SoloDriver[] = Object.entries(meta.driver_keys ?? {}).map(([key, d]: [string, any]) => ({
    key,
    label: d.label,
    val: latestVal[key] ?? d.val, // current run value if the run has progressed, else base
    min: d.min ?? 0,
    max: d.max ?? 100,
  }));

  const cast: SoloCastMember[] = (seats ?? [])
    .filter((s: any) => s.key !== 'ceo')
    .map((s: any) => ({
      seatKey: s.key,
      name: s.name,
      role: s.role,
      short: s.meta?.short ?? null,
      initials: s.meta?.initials ?? null,
      color: s.meta?.color ?? null,
      priority: s.meta?.priority ?? null,
    }));

  const cfg = content.CONFIG ?? {};
  return {
    ok: true,
    bundle: {
      sessionId,
      seatKey: participant.seat?.key,
      token,
      participantId: participant.id,
      scenarioTitle: scenario?.title ?? 'Scenario',
      company: content.COMPANY ?? { name: scenario?.title ?? '' },
      intro: content.INTRO ?? {},
      weekCount: meta.week_count ?? weeks.length,
      weekIdx: idx,
      drivers,
      dimensions: content.DIMENSIONS ?? {},
      cast,
      week: {
        n: w.n ?? idx + 1,
        title: w.title ?? '',
        seconds: w.seconds ?? null,
        situation: w.situation ?? '',
        advocacy: w.advocacy ?? {},
        feed: (w.feed ?? []).map((f: any) => ({ from: f.from, day: f.day ?? null, kind: f.kind ?? null, text: f.text })),
        surprises: (w.surprises ?? []).map((s: any) => ({ day: s.day, from: s.from, kind: s.kind ?? null, title: s.title ?? null, text: s.text })),
        pulse: w.pulse ? { from: w.pulse.from, text: w.pulse.text } : null,
        wire: w.wire ?? [],
      },
      config: {
        days: cfg.days ?? 7,
        weekSeconds: cfg.weekSeconds ?? meta.week_seconds ?? 300,
        extraDaysPerReprieve: cfg.extraDaysPerReprieve ?? 2,
        lowTimeDays: cfg.lowTimeDays ?? 1.6,
      },
      reprieveCost: content.REPRIEVE_COST ?? {},
      disposition: await effectiveDisposition(db, sessionId, participant.id, session.run_config?.disposition),
      lastDeltas,
    },
  };
}

// A concrete dial is used as-is; 'surprise'/'auto' (or unset) is resolved from the
// CEO's cross-session history (Phase 9, A3.2) — never surfaced to the player as such,
// but it drives the guarded-feed delay and the held-info hedge.
async function effectiveDisposition(
  db: ReturnType<typeof createAdminClient>,
  sessionId: string,
  participantId: string,
  dial: string | undefined,
): Promise<string> {
  const d = dial ?? 'request';
  if (d !== 'surprise' && d !== 'auto') return d;
  const subjectId = await subjectForParticipant(db, sessionId, participantId);
  return (await resolveDispositionFromHistory(db, subjectId)).disposition;
}
