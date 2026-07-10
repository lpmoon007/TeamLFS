import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

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
export interface SoloWeek {
  n: number;
  title: string;
  situation: string;
  advocacy: Record<string, string>;
  feed: SoloFeedItem[];
  wire: string[];
}
export interface SoloBundle {
  sessionId: string;
  seatKey: string;
  token: string;
  scenarioTitle: string;
  company: { name: string; sub?: string; logo?: string };
  intro: Record<string, unknown>;
  weekCount: number;
  weekIdx: number;
  drivers: SoloDriver[];
  dimensions: Record<string, string>;
  cast: SoloCastMember[];
  week: SoloWeek;
}

export type SoloResult =
  | { ok: true; bundle: SoloBundle }
  | { ok: false; reason: 'not_found' | 'invalid_token' | 'not_solo' | 'no_content' };

export async function loadSolo(sessionId: string, token: string | undefined, weekIdx = 0): Promise<SoloResult> {
  const db = createAdminClient();

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, status')
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

  const [{ data: scenario }, { data: contentDoc }, { data: seats }] = await Promise.all([
    db.from('scenarios').select('title').eq('id', session.scenario_id).maybeSingle<any>(),
    db.from('documents').select('body_json').eq('scenario_id', session.scenario_id).eq('key', 'solo_content').maybeSingle<any>(),
    db.from('seats').select('key, name, role, meta').eq('scenario_id', session.scenario_id),
  ]);
  const content = contentDoc?.body_json;
  if (!content) return { ok: false, reason: 'no_content' };

  const weeks: any[] = content.WEEKS ?? [];
  const idx = Math.max(0, Math.min(weeks.length - 1, weekIdx));
  const w = weeks[idx] ?? {};

  const drivers: SoloDriver[] = Object.entries(meta.driver_keys ?? {}).map(([key, d]: [string, any]) => ({
    key,
    label: d.label,
    val: d.val,
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

  return {
    ok: true,
    bundle: {
      sessionId,
      seatKey: participant.seat?.key,
      token,
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
        situation: w.situation ?? '',
        advocacy: w.advocacy ?? {},
        feed: (w.feed ?? []).map((f: any) => ({ from: f.from, day: f.day ?? null, kind: f.kind ?? null, text: f.text })),
        wire: w.wire ?? [],
      },
    },
  };
}
