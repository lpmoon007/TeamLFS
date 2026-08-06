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
// on a NEW condition, never on repetition). We point them at a scenario they haven't played and,
// when scenarios are tagged with the Tier-A markers they pressure, prefer the one that presses
// the leader's WEAKEST read — content-aware, not just a notch up in difficulty. The claim is
// earned: it rests on the authored scenario tag + the leader's own marker scores, never invention.

const MARKER_LABEL: Record<string, string> = {
  A1: 'Information-seeking', A2: 'Decision calibration', A3: 'Consultation breadth',
  A4: 'Truth-seeking over comfort', A5: 'Intent–action integrity', A6: 'Composure under escalation',
};

export interface NextScenario {
  scenario: { id: string; title: string; summary: string | null; difficulty: number | null; weekCount: number | null; realism: string };
  reason: string;
  openFindings: number;
  replay: boolean; // true when they've played everything and we recommend a re-test
  matchedMarker: string | null; // label of the weak marker this scenario presses (null when tags don't inform the pick)
  matchedScore: number | null; // the leader's score on that marker
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

/** Normalise a finding's marker field to a Tier-A key (A1–A6), or null. Tolerates keys,
 *  labels, and the odd free-text the model may store. */
function markerKey(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^A[1-6]$/i.test(s)) return s.toUpperCase();
  const lower = s.toLowerCase();
  for (const [k, label] of Object.entries(MARKER_LABEL)) if (label.toLowerCase() === lower) return k;
  return null;
}

/** The markers to aim the next run at: the leader's own findings' markers if they name one,
 *  else their weakest exercised reads. Priority order, deduped. */
function targetMarkers(fp: Fingerprint, ledger: Ledger | null): string[] {
  const keys: string[] = [];
  for (const c of ledger?.open ?? []) {
    const k = markerKey(c.marker);
    if (k && !keys.includes(k)) keys.push(k);
  }
  if (keys.length) return keys;
  // fallback: the two lowest markers with a real reading (insufficient/ceiling markers excluded)
  return (fp.markers ?? [])
    .filter((m) => m.n >= 1 && !m.insufficient)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 2)
    .map((m) => m.key);
}

async function coreNudge(subjectId: string, fp: Fingerprint | null, ledger: Ledger | null): Promise<NextScenario | null> {
  if (!fp || fp.runs < 1) return null; // the nudge only makes sense once they have a run to build on
  const db = createAdminClient();
  const runs = await resolveSubjectRuns(db, subjectId);
  const playedIds = new Set(runs.map((r) => r.session.scenario_id).filter(Boolean) as string[]);

  const scenarios = await listPlayableScenarios();
  if (!scenarios.length) return null;

  const unplayed = scenarios.filter((s) => !playedIds.has(s.id));
  const replay = unplayed.length === 0;
  const pool = replay ? scenarios.slice() : unplayed;

  // difficulty target: a notch up from what they've played
  const playedDiffs = scenarios.filter((s) => playedIds.has(s.id)).map((s) => s.difficulty ?? 1);
  const avgDiff = playedDiffs.length ? playedDiffs.reduce((a, b) => a + b, 0) / playedDiffs.length : 1;
  const target = avgDiff + 0.5;

  const targets = targetMarkers(fp, ledger);
  // rank: most overlap with the leader's weak markers first, then closest to the difficulty
  // target, then alphabetical — deterministic, and content-aware whenever tags inform it.
  const scored = pool.map((s) => {
    const overlap = (s.stresses ?? []).filter((k) => targets.includes(k));
    return { s, overlap, diffDist: Math.abs((s.difficulty ?? 1) - target) };
  });
  scored.sort((a, b) => b.overlap.length - a.overlap.length || a.diffDist - b.diffDist || a.s.title.localeCompare(b.s.title));
  const best = scored[0];
  if (!best) return null;
  const scenario = best.s;

  // the weak marker this pick actually presses (first target it's tagged with), for the reason
  const matchedKey = best.overlap.length ? targets.find((k) => best.overlap.includes(k)) ?? null : null;
  const matchedMarker = matchedKey ? MARKER_LABEL[matchedKey] : null;
  const matchedScore = matchedKey ? fp.markers.find((m) => m.key === matchedKey)?.avg ?? null : null;

  const openFindings = ledger?.open.length ?? 0;
  const runWord = `${fp.runs} run${fp.runs === 1 ? '' : 's'}`;

  let reason: string;
  if (replay) {
    reason = `You've run every scenario at least once. The next lift is depth, not breadth — replay the one that pressed you hardest and see whether your read holds when you already know the shape. A finding that survives a second, harder pass is one you can trust.`;
  } else if (matchedMarker) {
    reason =
      `${scenario.title} presses ${matchedMarker.toLowerCase()}` +
      (matchedScore != null ? ` — your lowest read so far, at ${matchedScore}/100` : '') +
      `. A finding firms up only when it survives a situation you haven't faced, so this is the run that tests it.`;
  } else if (openFindings > 0) {
    reason =
      `You have ${openFindings} open finding${openFindings === 1 ? '' : 's'} from ${runWord}${fp.runs < 2 ? ' — still directional' : ''}. ` +
      `They stay directional until they survive a situation you haven't faced. Running one you haven't played tests them under a new condition.`;
  } else {
    reason = `Run a second scenario and your six markers become comparable across conditions — that's when a strength or a gap becomes a real pattern rather than a single day.`;
  }

  return {
    scenario: { id: scenario.id, title: scenario.title, summary: scenario.summary, difficulty: scenario.difficulty, weekCount: scenario.weekCount, realism: scenario.realism },
    reason,
    openFindings,
    replay,
    matchedMarker,
    matchedScore,
  };
}
