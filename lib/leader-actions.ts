'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentFacilitator, ensureSubjectByEmail } from '@/lib/auth';
import { createSessionCore } from '@/lib/session-core';
import { buildSoloDebrief } from '@/lib/solo-debrief';

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
  score: number | null; // overall leadership read (null until the run has been scored)
  grade: string | null;
  complete: boolean; // reached the final weekly call
}
export interface LeaderStats {
  completed: number; // finished, scored runs
  avgScore: number; // mean leadership read across finished runs
  latestScore: number; // most recent finished run
  trend: number | null; // latest − previous finished run (null with <2 runs)
  strongest: { label: string; score: number } | null; // best leadership dimension on average
  weakest: { label: string; score: number } | null; // the dimension to work on
  spark: number[]; // finished-run scores, oldest → newest (for a sparkline)
}
export interface LeaderHome {
  runs: LeaderRun[];
  stats: LeaderStats | null; // null until the leader has a finished run
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

/** The signed-in leader's own runs + their aggregate leadership stats across finished runs
 *  (their behavioral-memory view). Each debrief is built once and reused for both. */
export async function getLeaderHome(): Promise<LeaderHome> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return { runs: [], stats: null };
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  if (!subject) return { runs: [], stats: null };

  const { data: parts } = await db
    .from('participants')
    .select('token, session:sessions!inner(id, status, started_at, scenario_id, scenario:scenarios!inner(title))')
    .eq('subject_id', subject.id)
    .not('token', 'is', null);
  const rows = (parts ?? []).filter((p: any) => p.session);

  // week counts, to tell a finished run (all weekly calls made) from one still in progress
  const scnIds = [...new Set(rows.map((p: any) => p.session.scenario_id))];
  const weekBy = new Map<string, number>();
  if (scnIds.length) {
    const { data: metas } = await db.from('scenario_meta').select('scenario_id, week_count').in('scenario_id', scnIds);
    for (const m of metas ?? []) if ((m as any).week_count) weekBy.set((m as any).scenario_id, (m as any).week_count);
  }

  // build each debrief once (token-scoped); keep the dims of finished runs for aggregation
  const dimTotals = new Map<string, { label: string; sum: number; n: number }>();
  const built = await Promise.all(
    rows.map(async (p: any) => {
      const s = p.session;
      const t = `?t=${p.token}`;
      let score: number | null = null;
      let grade: string | null = null;
      let complete = false;
      try {
        const d = await buildSoloDebrief(s.id, p.token);
        if (d.ok) {
          score = d.debrief.overall;
          grade = d.debrief.grade;
          const decisions = d.debrief.gameFilm.filter((m) => m.type === 'decision').length;
          const wc = weekBy.get(s.scenario_id) ?? null;
          complete = wc ? decisions >= wc : score !== null;
          if (complete) {
            for (const dim of d.debrief.dims) {
              const cur = dimTotals.get(dim.key) ?? { label: dim.label, sum: 0, n: 0 };
              cur.sum += dim.score;
              cur.n += 1;
              dimTotals.set(dim.key, cur);
            }
          }
        }
      } catch {
        /* a run that can't be scored yet just shows no score */
      }
      const run: LeaderRun = {
        sessionId: s.id,
        scenario: s.scenario?.title ?? '—',
        status: s.status,
        startedAt: s.started_at ?? null,
        playUrl: `/solo/${s.id}${t}`,
        debriefUrl: `/solo/${s.id}/debrief${t}`,
        score,
        grade,
        complete,
      };
      return run;
    }),
  );

  const runs = built.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));

  // aggregate over finished, scored runs (oldest → newest for the trend line)
  const finished = built
    .filter((r) => r.complete && r.score !== null)
    .sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
  let stats: LeaderStats | null = null;
  if (finished.length) {
    const spark = finished.map((r) => r.score as number);
    const avgScore = Math.round(spark.reduce((a, b) => a + b, 0) / spark.length);
    const latestScore = spark[spark.length - 1];
    const trend = spark.length >= 2 ? latestScore - spark[spark.length - 2] : null;
    const dims = [...dimTotals.values()].map((d) => ({ label: d.label, score: Math.round(d.sum / d.n) }));
    dims.sort((a, b) => b.score - a.score);
    const strongest = dims.length ? dims[0] : null;
    const weakest = dims.length ? dims[dims.length - 1] : null;
    stats = { completed: finished.length, avgScore, latestScore, trend, strongest, weakest, spark };
  }

  return { runs, stats };
}
