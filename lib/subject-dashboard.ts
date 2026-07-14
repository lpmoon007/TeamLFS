import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { PANEL_TAXONOMY } from '@/lib/panel';
import { subjectPosture } from '@/lib/spine';
import { subjectDivergence, type Divergence } from '@/lib/divergence';
import { getRubric } from '@/lib/scoring';

type Db = ReturnType<typeof createAdminClient>;

// The longitudinal read (Behavioral Memory Spine payoff) — a person's arc ACROSS sessions,
// not one run. Identity + the divergence quadrant + the run-by-run panel history + the
// confidence-weighted trait posture. Everything is a Layer-2 read over the versioned
// panel/profile rows; nothing here mutates capture.

export interface RunPoint {
  sessionId: string;
  scenario: string;
  mode: 'solo' | 'team';
  tierA: number | null;
  tierB: number | null;
  at: string;
}
export interface TraitPosturePoint {
  key: string;
  label: string;
  mean: number; // -1..1 (value_num scale)
  pole: string | null;
  confidence: number;
  points: number;
}
export interface SubjectDashboard {
  subjectId: string;
  displayName: string;
  handle: string;
  sessions: number;
  divergence: Divergence;
  runs: RunPoint[]; // newest first
  soloAvg: number | null;
  teamAvg: number | null;
  posture: TraitPosturePoint[];
}

export async function loadSubjectDashboard(subjectId: string): Promise<SubjectDashboard | null> {
  const db: Db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id, handle, display_name').eq('id', subjectId).maybeSingle<any>();
  if (!subject) return null;

  const [{ data: panelRows }, posture, divergence] = await Promise.all([
    db
      .from('behavioral_panel')
      .select('session_id, mode, tier_a, tier_b, created_at, scenario:scenarios(title)')
      .eq('subject_id', subjectId)
      .eq('taxonomy_version', PANEL_TAXONOMY)
      .order('created_at', { ascending: false }),
    subjectPosture(db, subjectId),
    subjectDivergence(db, subjectId),
  ]);

  const runs: RunPoint[] = ((panelRows ?? []) as any[]).map((r) => ({
    sessionId: r.session_id,
    scenario: r.scenario?.title ?? 'Scenario',
    mode: r.mode,
    tierA: r.tier_a !== null && r.tier_a !== undefined ? Number(r.tier_a) : null,
    tierB: r.tier_b !== null && r.tier_b !== undefined ? Number(r.tier_b) : null,
    at: r.created_at,
  }));

  const soloTierA = runs.filter((r) => r.mode === 'solo' && r.tierA !== null).map((r) => r.tierA as number);
  const teamTierB = runs.filter((r) => r.mode === 'team' && r.tierB !== null).map((r) => r.tierB as number);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const humanize = (k: string) => k.replace(/_vs_/g, ' vs ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const postureOut: TraitPosturePoint[] = posture.traits
    .map((t) => {
      const rubric = getRubric(t.trait_key);
      const pole = !rubric ? null : t.mean > 0.2 ? rubric.poles.positive : t.mean < -0.2 ? rubric.poles.negative : rubric.poles.neutral;
      return { key: t.trait_key, label: humanize(t.trait_key), mean: Math.round(t.mean * 100) / 100, pole, confidence: t.confidence, points: t.points };
    })
    .sort((a, b) => Math.abs(b.mean) - Math.abs(a.mean));

  return {
    subjectId,
    displayName: subject.display_name || subject.handle,
    handle: subject.handle,
    sessions: posture.sessions,
    divergence,
    runs,
    soloAvg: avg(soloTierA),
    teamAvg: avg(teamTierB),
    posture: postureOut,
  };
}
