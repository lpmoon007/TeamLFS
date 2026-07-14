import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAllWeeks } from '@/lib/solo-week';
import type { SpineEvent } from '@/lib/scoring/types';

type Db = ReturnType<typeof createAdminClient>;

// Behavioral Panel computation (Two-Tier Spec §3-4). Turns the LOCKED event log into
// panel markers — RATES (per opportunity the scenario offered) so they mean the same
// thing across scenarios. Each marker ships raw + normalized + percentile + confidence
// + whether it was `exercised` (Spec §2: never score an opportunity the scenario didn't
// present; report "not exercised" instead of 0). Pure over events + authored content.

export const PANEL_TAXONOMY = 'panel-v0.1';
export const PANEL_SCORER = 'panel-v0.1.0';

export type Confidence = 'high' | 'medium' | 'low';
export interface Marker {
  key: string;
  label: string;
  tier: 'A' | 'B';
  raw: number | null; // 0..1 rate
  normalized: number | null; // 0..100, difficulty-adjusted
  percentile: number | null; // vs cohort — null until norms mature
  confidence: Confidence;
  exercised: boolean;
}
export interface PanelResult {
  markers: Record<string, Marker>;
  tierA: number | null; // composite 0..100
  tierB: number | null; // composite 0..100 (null when no Tier-B markers exercised, e.g. solo)
  quadrant: 'multiplier' | 'lone_genius' | 'connector' | 'struggling' | 'na';
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const MARKS: { key: string; label: string; tier: 'A' | 'B' }[] = [
  { key: 'A1', label: 'Information-seeking', tier: 'A' },
  { key: 'A2', label: 'Decision calibration', tier: 'A' },
  { key: 'A3', label: 'Consultation breadth', tier: 'A' },
  { key: 'A4', label: 'Truth-seeking over comfort', tier: 'A' },
  { key: 'A5', label: 'Intent–action integrity', tier: 'A' },
  { key: 'A6', label: 'Composure under escalation', tier: 'A' },
  { key: 'B1', label: 'Airtime equality', tier: 'B' },
  { key: 'B2', label: 'Voice / speaking up', tier: 'B' },
  { key: 'B3', label: 'Backup & support', tier: 'B' },
  { key: 'B4', label: 'Unique-information sharing', tier: 'B' },
  { key: 'B5', label: 'Responsiveness / closed-loop', tier: 'B' },
  { key: 'B6', label: 'Mutual monitoring', tier: 'B' },
];
const meta = (k: string) => MARKS.find((m) => m.key === k)!;

/** Build one marker. `raw` is a 0..1 rate; normalized applies difficulty (harder run →
 *  the same rate reads a touch higher), clamped to 0..100. Not-exercised → all null. */
function mk(key: string, raw: number | null, confidence: Confidence, exercised: boolean, difficulty = 1): Marker {
  const m = meta(key);
  const r = exercised && raw !== null ? clamp01(raw) : null;
  const normalized = r === null ? null : Math.round(clamp01(r * (0.85 + 0.15 * difficulty)) * 100);
  return { key, label: m.label, tier: m.tier, raw: r, normalized, percentile: null, confidence, exercised };
}

function composite(markers: Marker[], tier: 'A' | 'B'): number | null {
  const scored = markers.filter((m) => m.tier === tier && m.exercised && m.normalized !== null);
  if (!scored.length) return null;
  // confidence-weighted mean (high=1, medium=.6, low=.3)
  const w = (c: Confidence) => (c === 'high' ? 1 : c === 'medium' ? 0.6 : 0.3);
  let num = 0, den = 0;
  for (const m of scored) { num += (m.normalized as number) * w(m.confidence); den += w(m.confidence); }
  return den ? Math.round(num / den) : null;
}

function quadrantOf(a: number | null, b: number | null): PanelResult['quadrant'] {
  if (a === null || b === null) return 'na';
  const hiA = a >= 55, hiB = b >= 55;
  return hiA && hiB ? 'multiplier' : hiA && !hiB ? 'lone_genius' : !hiA && hiB ? 'connector' : 'struggling';
}

/** Solo panel — Tier A from the CEO's event log; Tier B is n/a (no team to contribute
 *  to beyond the advisor-consultation slice, captured within A1/A3/A4). */
export function computeSoloPanel(events: SpineEvent[], content: any, branch: string | null, difficulty = 1): PanelResult {
  const TEAM: any[] = content.TEAM ?? [];
  const teamIds = new Set(TEAM.map((t) => t.id));
  const weeks = resolveAllWeeks(content, branch);
  const holdsAll = weeks.flatMap((w: any) => (w.holds ?? []).map((h: any) => ({ from: h.from, weekN: w.n })));

  const asks = events.filter((e) => e.type === 'message_sent' && teamIds.has(String(e.target)));
  const decisions = events.filter((e) => e.type === 'message_sent' && e.target === 'decision');
  const surfaced = events.filter((e) => e.type === 'hold_surfaced');

  const askedIds = new Set(asks.map((e) => String(e.target)));
  const surfacedKeys = new Set(surfaced.map((e: any) => `${e.payload_json?.week}:${e.target}`));
  const pulled = holdsAll.filter((h) => surfacedKeys.has(`${h.weekN}:${h.from}`)).length;
  const holdHolders = new Set(holdsAll.map((h) => h.from));
  const contactedHolders = [...holdHolders].filter((h) => askedIds.has(h)).length;

  const nDec = decisions.length;
  const buzzerRate = nDec ? decisions.filter((e: any) => e.payload_json?.underBuzzer).length / nDec : 0;
  const weeksWithAsks = new Set(asks.map((e: any) => e.payload_json?.week)).size;

  const markers = [
    mk('A1', holdsAll.length ? pulled / holdsAll.length : null, 'high', holdsAll.length > 0, difficulty),
    mk('A2', nDec ? 1 - buzzerRate * 0.6 : null, 'medium', nDec > 0, difficulty),
    mk('A3', TEAM.length ? askedIds.size / TEAM.length : null, 'high', TEAM.length > 0, difficulty),
    mk('A4', holdHolders.size ? contactedHolders / holdHolders.size : null, 'medium', holdHolders.size > 0, difficulty),
    mk('A5', null, 'low', false, difficulty), // intent–action integrity needs the stated-pulse capture (not yet)
    mk('A6', nDec > 1 ? weeksWithAsks / nDec : null, 'medium', nDec > 1, difficulty),
    // Tier B: solo has no team room — reported n/a (the teaming slice lives in Tier A here)
    ...['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((k) => mk(k, null, 'low', false, difficulty)),
  ];

  const map = Object.fromEntries(markers.map((m) => [m.key, m]));
  const tierA = composite(markers, 'A');
  const tierB = composite(markers, 'B');
  return { markers: map, tierA, tierB, quadrant: quadrantOf(tierA, tierB) };
}

/** Compute + persist a solo run's panel draw (called from scoreSoloRun). One row per
 *  run, versioned (replace-on-rescore). Loads the authored content + difficulty. */
export async function persistSoloPanel(
  db: Db,
  sessionId: string,
  participantId: string,
  events: SpineEvent[],
  subjectId: string | null,
): Promise<void> {
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return;
  const [{ data: contentDoc }, { data: metaRow }, { data: branchRuling }] = await Promise.all([
    db.from('documents').select('body_json').eq('scenario_id', session.scenario_id).eq('key', 'solo_content').maybeSingle<any>(),
    db.from('scenario_meta').select('difficulty').eq('scenario_id', session.scenario_id).maybeSingle<any>(),
    db.from('rulings').select('branch_key').eq('session_id', sessionId).eq('participant_id', participantId).not('branch_key', 'is', null).order('week_idx', { ascending: false }).limit(1).maybeSingle<any>(),
  ]);
  const content = contentDoc?.body_json;
  if (!content) return;
  const difficulty = Number(metaRow?.difficulty ?? 1);
  const panel = computeSoloPanel(events, content, branchRuling?.branch_key ?? null, difficulty);

  await db.from('behavioral_panel').delete().eq('session_id', sessionId).eq('participant_id', participantId);
  await db.from('behavioral_panel').insert({
    session_id: sessionId,
    participant_id: participantId,
    subject_id: subjectId,
    scenario_id: session.scenario_id,
    mode: 'solo',
    difficulty,
    markers: panel.markers as any,
    tier_a: panel.tierA,
    tier_b: panel.tierB,
    quadrant: panel.quadrant,
    provisional: true,
    taxonomy_version: PANEL_TAXONOMY,
    scorer_version: PANEL_SCORER,
  });

  // Roll this run into the cohort reference ranges (Two-Tier Spec §9). Derived — never
  // block the run's own panel on the norm update.
  try {
    const { recomputePanelNorms } = await import('@/lib/panel-norms');
    await recomputePanelNorms(db, 'solo');
  } catch {
    /* norms are a convenience read; a failure here must not fail scoring */
  }
}
