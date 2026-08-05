import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveSubjectRuns } from '@/lib/profile/subject-runs';
import { listPlayableScenarios } from '@/lib/leader-actions';
import { buildFingerprint } from '@/lib/profile/fingerprint';
import { getLedger } from '@/lib/profile/ledger';
import type { Fingerprint } from '@/lib/profile/fingerprint';
import type { Ledger } from '@/lib/profile/ledger';

// The next-scenario nudge — turns the profile into a training plan. The honest principle: a
// finding only firms up when it survives a situation the leader hasn't faced (confidence rises
// on a NEW condition, never on repetition). So we point them at a scenario they haven't played
// — a notch up in difficulty — and name, from their own data, what the run will test. We never
// claim a scenario targets a specific marker (no such mapping exists — that would be invention).

export interface NextScenario {
  scenario: { id: string; title: string; summary: string | null; difficulty: number | null; weekCount: number | null; realism: string };
  reason: string;
  openFindings: number;
  replay: boolean; // true when they've played everything and we recommend a re-test
}

/** Leader's own profile — fp/ledger are already built by the page, so reuse them. */
export async function buildNextScenario(email: string, fp: Fingerprint | null, ledger: Ledger | null): Promise<NextScenario | null> {
  if (!fp || fp.runs < 1) return null;
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', email.toLowerCase()).maybeSingle<any>();
  if (!subject) return null;
  return coreNudge(subject.id, fp, ledger);
}

/** Admin/coach subject dashboard — resolve the person's fp/ledger from their subject id. */
export async function buildNextScenarioForSubject(subjectId: string): Promise<NextScenario | null> {
  const [fp, ledger] = await Promise.all([buildFingerprint(subjectId), getLedger(subjectId)]);
  return coreNudge(subjectId, fp, ledger);
}

async function coreNudge(subjectId: string, fp: Fingerprint | null, ledger: Ledger | null): Promise<NextScenario | null> {
  if (!fp || fp.runs < 1) return null; // the nudge only makes sense once they have a run to build on
  const db = createAdminClient();
  const runs = await resolveSubjectRuns(db, subjectId);
  const playedIds = new Set(runs.map((r) => r.session.scenario_id).filter(Boolean) as string[]);

  const scenarios = await listPlayableScenarios();
  if (!scenarios.length) return null;

  const unplayed = scenarios.filter((s) => !playedIds.has(s.id));
  let scenario = null as (typeof scenarios)[number] | null;
  let replay = false;

  if (unplayed.length) {
    // a notch up from their current average difficulty — enough to press the gap, not to bury them
    const playedDiffs = scenarios.filter((s) => playedIds.has(s.id)).map((s) => s.difficulty ?? 1);
    const avgDiff = playedDiffs.length ? playedDiffs.reduce((a, b) => a + b, 0) / playedDiffs.length : 1;
    const target = avgDiff + 0.5;
    scenario = unplayed.slice().sort((a, b) => Math.abs((a.difficulty ?? 1) - target) - Math.abs((b.difficulty ?? 1) - target))[0];
  } else {
    replay = true;
    scenario = scenarios.slice().sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0))[0] ?? null;
  }
  if (!scenario) return null;

  const openFindings = ledger?.open.length ?? 0;
  const runWord = `${fp.runs} run${fp.runs === 1 ? '' : 's'}`;
  const gap = fp.gap;

  let reason: string;
  if (replay) {
    reason = `You've run every scenario at least once. The next lift is depth, not breadth — replay the one that pressed you hardest and see whether your read holds when you already know the shape. A finding that survives a second, harder pass is one you can trust.`;
  } else if (openFindings > 0) {
    reason =
      `You have ${openFindings} open finding${openFindings === 1 ? '' : 's'} from ${runWord}${fp.runs < 2 ? ' — still directional' : ''}. ` +
      `They stay directional until they survive a situation you haven't faced. Running one you haven't played is what lets your next profile test them under a new condition` +
      (gap ? `, starting with your lowest read — ${gap.label} at ${gap.avg}/100.` : '.');
  } else {
    reason = `Run a second scenario and your six markers become comparable across conditions — that's when a strength or a gap becomes a real pattern rather than a single day.`;
  }

  return {
    scenario: { id: scenario.id, title: scenario.title, summary: scenario.summary, difficulty: scenario.difficulty, weekCount: scenario.weekCount, realism: scenario.realism },
    reason,
    openFindings,
    replay,
  };
}
