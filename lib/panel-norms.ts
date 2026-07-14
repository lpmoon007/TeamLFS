import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { PANEL_TAXONOMY } from '@/lib/panel';

type Db = ReturnType<typeof createAdminClient>;

// Panel reference ranges (Two-Tier Spec §9). As runs land, we accumulate a cohort
// distribution per marker so a raw score can be reported as a PERCENTILE against peers —
// the difference between "you scored 72" and "72 puts you in the top quartile of leaders
// who faced this." Ranges stay PROVISIONAL until N is sufficient (~30-50); below that we
// show the number but not a percentile, and say so. Nothing here mutates capture — it's a
// derived Layer-2 read/write over the versioned behavioral_panel rows.

export const MATURE_N = 30; // cohort size at which a percentile is trustworthy enough to show

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// erf via Abramowitz-Stegun 7.1.26 (max error ~1.5e-7) → normal CDF for percentiles.
function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return s * y;
}

/** Percentile (1..99) of a value against a normal cohort summary. sd 0 → 50 (no spread). */
export function normalPercentile(mean: number, sd: number, value: number): number {
  if (!sd || sd <= 0) return 50;
  const z = (value - mean) / sd;
  return clamp(Math.round(100 * 0.5 * (1 + erf(z / Math.SQRT2))), 1, 99);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export interface NormRow {
  cohort: string;
  marker: string;
  n: number;
  mean: number;
  sd: number;
  p10: number;
  p50: number;
  p90: number;
}

/** Extract exercised normalized marker values from a behavioral_panel.markers blob. */
function normalizedValues(markers: any): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, m] of Object.entries((markers ?? {}) as Record<string, any>)) {
    if (m && m.exercised && typeof m.normalized === 'number') out[k] = m.normalized;
  }
  return out;
}

function summarize(values: number[]): Omit<NormRow, 'cohort' | 'marker'> {
  const n = values.length;
  const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  return { n, mean: round2(mean), sd: round2(sd), p10: round2(quantile(sorted, 0.1)), p50: round2(quantile(sorted, 0.5)), p90: round2(quantile(sorted, 0.9)) };
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Recompute + persist per-marker norms for a mode from every persisted panel of that
 *  mode. Cohorts: 'all' + one per scenario ('scenario:<id>'). Idempotent (full recompute,
 *  upsert). Called after a panel lands; cheap at current N, revisit if the table grows. */
export async function recomputePanelNorms(db: Db, mode: 'solo' | 'team'): Promise<void> {
  const { data: rows } = await db
    .from('behavioral_panel')
    .select('scenario_id, markers')
    .eq('mode', mode)
    .eq('taxonomy_version', PANEL_TAXONOMY);
  if (!rows) return;

  // cohort → marker → values
  const buckets = new Map<string, Map<string, number[]>>();
  const add = (cohort: string, marker: string, v: number) => {
    let byMarker = buckets.get(cohort);
    if (!byMarker) buckets.set(cohort, (byMarker = new Map()));
    (byMarker.get(marker) ?? byMarker.set(marker, []).get(marker)!).push(v);
  };
  for (const r of rows as any[]) {
    const vals = normalizedValues(r.markers);
    for (const [marker, v] of Object.entries(vals)) {
      add('all', marker, v);
      if (r.scenario_id) add(`scenario:${r.scenario_id}`, marker, v);
    }
  }

  const upserts: any[] = [];
  const now = new Date().toISOString();
  for (const [cohort, byMarker] of buckets) {
    for (const [marker, values] of byMarker) {
      const s = summarize(values);
      upserts.push({ cohort, marker, taxonomy_version: PANEL_TAXONOMY, ...s, updated_at: now });
    }
  }
  if (upserts.length) await db.from('panel_norms').upsert(upserts, { onConflict: 'cohort,marker,taxonomy_version' });
}

/** Read norms for a set of cohorts → Map keyed `${cohort}:${marker}`. */
export async function readNormsMap(db: Db, cohorts: string[]): Promise<Map<string, NormRow>> {
  const map = new Map<string, NormRow>();
  if (!cohorts.length) return map;
  const { data } = await db
    .from('panel_norms')
    .select('cohort, marker, n, mean, sd, p10, p50, p90')
    .eq('taxonomy_version', PANEL_TAXONOMY)
    .in('cohort', cohorts);
  for (const r of (data ?? []) as any[]) map.set(`${r.cohort}:${r.marker}`, r as NormRow);
  return map;
}

export interface MarkerNorm {
  percentile: number | null; // null until the cohort matures
  p10: number;
  p50: number;
  p90: number;
  n: number;
  cohort: string;
  provisional: boolean;
}

/** For one marker value, pick the best available cohort (most specific that has data) and
 *  return its reference read. Percentile only when the cohort is mature (honest §9). */
export function readMarkerNorm(norms: Map<string, NormRow>, cohortsInPreference: string[], marker: string, value: number | null): MarkerNorm | null {
  for (const cohort of cohortsInPreference) {
    const row = norms.get(`${cohort}:${marker}`);
    if (!row || !row.n) continue;
    const mature = row.n >= MATURE_N;
    return {
      percentile: mature && value !== null ? normalPercentile(row.mean, row.sd, value) : null,
      p10: row.p10,
      p50: row.p50,
      p90: row.p90,
      n: row.n,
      cohort,
      provisional: !mature,
    };
  }
  return null;
}
