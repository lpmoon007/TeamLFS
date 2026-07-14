import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { PANEL_TAXONOMY } from '@/lib/panel';

type Db = ReturnType<typeof createAdminClient>;

// The divergence read (Two-Tier Spec §5) — the payoff of two independent axes. A person's
// executive judgment (Tier A, from solo runs) crossed with their teaming contribution
// (Tier B, from team runs) places them in one of four quadrants. This is the read no
// single-axis board can produce: the Lone Genius (sharp calls, doesn't lift the room) vs
// the Connector (lifts the room, judgment still forming) vs the Multiplier (both).

export type Quadrant = 'multiplier' | 'lone_genius' | 'connector' | 'struggling' | 'na';

export interface Divergence {
  tierA: number | null; // mean solo Tier A across the subject's runs
  tierB: number | null; // mean per-person team Tier B across the subject's runs
  quadrant: Quadrant;
  soloRuns: number;
  teamRuns: number;
  label: string;
  read: string;
}

const HI = 55; // same threshold as the per-run panel quadrant (panel.ts quadrantOf)

const COPY: Record<Exclude<Quadrant, 'na'>, { label: string; read: string }> = {
  multiplier: {
    label: 'Multiplier',
    read: 'You make sharp calls AND lift the room — the rarest and most valuable pattern. Your judgment holds under pressure and your presence raises what the people around you contribute.',
  },
  lone_genius: {
    label: 'Lone Genius',
    read: 'Your individual judgment is strong, but it isn’t yet translating into the team’s output — the room doesn’t rise the way your own calls do. The growth edge is teaming: surfacing your reasoning, drawing others in, making your judgment contagious.',
  },
  connector: {
    label: 'Connector',
    read: 'You lift the room — people contribute more and dissent survives when you’re in it — while your own executive judgment is still sharpening. The room already trusts you; the edge is backing that trust with harder-edged calls.',
  },
  struggling: {
    label: 'Still forming',
    read: 'Neither axis is reading high yet. That’s a starting point, not a verdict — both executive judgment and teaming are trainable, and the panel exists precisely to show which moves shift them.',
  },
};

function quadrantOf(a: number | null, b: number | null): Quadrant {
  if (a === null || b === null) return 'na';
  const hiA = a >= HI;
  const hiB = b >= HI;
  return hiA && hiB ? 'multiplier' : hiA && !hiB ? 'lone_genius' : !hiA && hiB ? 'connector' : 'struggling';
}

/** A subject's cross-session divergence: Tier A (mean over solo panels) × Tier B (mean
 *  over per-person team panels). Quadrant 'na' until BOTH axes have at least one run. */
export async function subjectDivergence(db: Db, subjectId: string): Promise<Divergence> {
  const { data } = await db
    .from('behavioral_panel')
    .select('mode, tier_a, tier_b, participant_id')
    .eq('subject_id', subjectId)
    .eq('taxonomy_version', PANEL_TAXONOMY);
  const rows = (data ?? []) as any[];
  const soloA = rows.filter((r) => r.mode === 'solo' && r.tier_a !== null).map((r) => Number(r.tier_a));
  const teamB = rows.filter((r) => r.mode === 'team' && r.participant_id && r.tier_b !== null).map((r) => Number(r.tier_b));
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const tierA = mean(soloA);
  const tierB = mean(teamB);
  const quadrant = quadrantOf(tierA, tierB);
  const copy = quadrant === 'na' ? { label: '', read: '' } : COPY[quadrant];
  return { tierA, tierB, quadrant, soloRuns: soloA.length, teamRuns: teamB.length, label: copy.label, read: copy.read };
}
