'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentFacilitator, ensureSubjectByEmail } from '@/lib/auth';
import { createSessionCore } from '@/lib/session-core';

// Self-serve play for a signed-in account (built for the play-only 'leader' role). A leader
// never touches the console — they sign in, pick a solo scenario, and play as the CEO. Every
// run is pre-linked to their behavioral-memory profile (a spine `subject` keyed by email) so
// their history accumulates across sessions. Staff can use this surface too (to test).

export interface PlayableScenario {
  id: string;
  title: string;
  summary: string | null;
  realism: string;
  difficulty: number | null;
  weekCount: number | null;
}
export interface LeaderRun {
  sessionId: string;
  scenario: string;
  status: string;
  startedAt: string | null;
  playUrl: string;
  debriefUrl: string;
}

/** The solo scenarios a leader can play (they're always the CEO). */
export async function listPlayableScenarios(): Promise<PlayableScenario[]> {
  const me = await currentFacilitator();
  if (!me) return [];
  const db = createAdminClient();
  const { data: metas } = await db.from('scenario_meta').select('*').eq('mode_default', 'solo');
  const ids = (metas ?? []).map((m: any) => m.scenario_id);
  if (!ids.length) return [];
  const { data: scns } = await db.from('scenarios').select('id, title, summary').in('id', ids);
  const byId = new Map<string, any>((scns ?? []).map((s: any) => [s.id, s]));
  return (metas ?? [])
    .map((m: any) => {
      const s = byId.get(m.scenario_id);
      if (!s) return null;
      return {
        id: s.id,
        title: s.title,
        summary: s.summary ?? null,
        realism: m.realism ?? 'realistic',
        difficulty: m.difficulty ?? null,
        weekCount: m.week_count ?? null,
      } as PlayableScenario;
    })
    .filter((x): x is PlayableScenario => !!x)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Start a fresh solo run for the signed-in leader, pre-linked to their memory profile.
 *  Returns the play URL to drop straight into the run. */
export async function startLeaderRun(scenarioId: string): Promise<{ ok: boolean; url?: string; reason?: string }> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return { ok: false, reason: 'not_signed_in' };

  const db = createAdminClient();
  const { data: meta } = await db.from('scenario_meta').select('mode_default').eq('scenario_id', scenarioId).maybeSingle<any>();
  if (!meta) return { ok: false, reason: 'scenario_not_found' };
  if (meta.mode_default !== 'solo') return { ok: false, reason: 'not_solo' }; // leaders play solo (they're the CEO)

  const subjectId = await ensureSubjectByEmail(me.email, me.displayName);
  const res = await createSessionCore(db, {
    scenarioId,
    disposition: 'request',
    assignments: subjectId ? [{ seatKey: 'ceo', subjectId }] : undefined,
  });
  if (!res.ok || !res.links) return { ok: false, reason: res.reason ?? 'create_failed' };
  const ceo = res.links.find((l) => l.seatKey === 'ceo');
  if (!ceo?.path) return { ok: false, reason: 'no_play_link' };
  return { ok: true, url: ceo.path };
}

/** The signed-in leader's own past runs (for their history / behavioral-memory view). */
export async function listLeaderRuns(): Promise<LeaderRun[]> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return [];
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  if (!subject) return [];

  const { data: parts } = await db
    .from('participants')
    .select('token, session:sessions!inner(id, status, started_at, scenario:scenarios!inner(title))')
    .eq('subject_id', subject.id)
    .not('token', 'is', null);
  const runs: LeaderRun[] = (parts ?? [])
    .map((p: any) => {
      const s = p.session;
      if (!s) return null;
      const t = p.token ? `?t=${p.token}` : '';
      return {
        sessionId: s.id,
        scenario: s.scenario?.title ?? '—',
        status: s.status,
        startedAt: s.started_at ?? null,
        playUrl: `/solo/${s.id}${t}`,
        debriefUrl: `/solo/${s.id}/debrief${t}`,
      } as LeaderRun;
    })
    .filter((x): x is LeaderRun => !!x)
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
  return runs;
}
