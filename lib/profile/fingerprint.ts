import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSoloDebrief } from '@/lib/solo-debrief';
import { resolveSubjectRuns } from '@/lib/profile/subject-runs';

// The leadership fingerprint — the longitudinal read that IS comparable across scenarios.
// Built from the Tier-A behavioral panel (the six normalised markers, scored as difficulty-
// adjusted rates) averaged across a person's completed runs. Never from raw dimension scores:
// those are in-scenario only and stacking them across scenarios is the exact confound this
// layer exists to remove (Screen-13 handoff §3). Keyed on the subject (cross-run = per person).

const CONDITION: Record<string, string> = { served: 'forthcoming', request: 'neutral', guarded: 'guarded', surprise: 'surprise' };

export interface FingerprintMarker {
  key: string;
  label: string;
  avg: number; // mean normalised rate across runs that exercised it
  latest: number;
  trend: number | null; // latest − previous (null with <2 exercised runs)
  n: number; // runs that exercised this marker
  conditions: string[]; // distinct team dispositions it's been tested under
  confidence: 'provisional' | 'moderate' | 'high';
  series: number[]; // oldest → newest, for a sparkline
  insufficient?: boolean; // too little evidence to state a rate (a ceiling on one run, or never exercised)
}

// the six Tier-A markers, always rendered — a marker with no data shows "insufficient evidence",
// never a silent drop or a zero (Screen-15 §1a / §2c).
const A_MARKERS: [string, string][] = [
  ['A1', 'Information-seeking'], ['A2', 'Decision calibration'], ['A3', 'Consultation breadth'],
  ['A4', 'Truth-seeking over comfort'], ['A5', 'Intent–action integrity'], ['A6', 'Composure under escalation'],
];
export interface FingerprintRun {
  sessionId: string;
  scenario: string;
  score: number;
  grade: string;
  condition: string;
  date: string | null;
  debriefUrl: string;
}
export interface Fingerprint {
  runs: number; // completed, scored runs
  provisional: boolean; // < 2 runs — read is directional, not firm
  conditions: string[]; // all dispositions tested across runs
  markers: FingerprintMarker[];
  strength: { label: string; avg: number; n: number } | null; // consistent top marker
  gap: { label: string; avg: number; n: number } | null; // consistent lowest marker
  trajectory: number[]; // overall score, oldest → newest
  runLog: FingerprintRun[];
}

const confidenceOf = (n: number, conditions: number): FingerprintMarker['confidence'] =>
  n >= 3 && conditions >= 2 ? 'high' : n >= 2 || conditions >= 2 ? 'moderate' : 'provisional';

/** Build the fingerprint for a subject (the person). Returns null if they have no scored run. */
export async function buildFingerprint(subjectId: string): Promise<Fingerprint | null> {
  const db = createAdminClient();
  const rows = await resolveSubjectRuns(db, subjectId);
  if (!rows.length) return null;

  // week counts, to tell a finished run from one in progress
  const scnIds = [...new Set(rows.map((p) => p.session.scenario_id).filter(Boolean))] as string[];
  const weekBy = new Map<string, number>();
  if (scnIds.length) {
    const { data: metas } = await db.from('scenario_meta').select('scenario_id, week_count').in('scenario_id', scnIds);
    for (const m of metas ?? []) if ((m as any).week_count) weekBy.set((m as any).scenario_id, (m as any).week_count);
  }

  // build each debrief once; keep only finished, scored runs, oldest → newest
  type Built = { sessionId: string; overall: number; grade: string; condition: string; markers: any[]; scenario: string; date: string | null; debriefUrl: string };
  const built: Built[] = [];
  await Promise.all(
    rows.map(async (p: any) => {
      const s = p.session;
      try {
        const d = await buildSoloDebrief(s.id, p.token);
        if (!d.ok) return;
        const decisions = d.debrief.gameFilm.filter((m) => m.type === 'decision').length;
        const wc = weekBy.get(s.scenario_id) ?? null;
        const complete = wc ? decisions >= wc : true;
        if (!complete) return;
        built.push({
          sessionId: s.id,
          overall: d.debrief.overall,
          grade: d.debrief.grade,
          condition: CONDITION[s.run_config?.disposition as string] ?? 'neutral',
          markers: d.debrief.panel?.markers ?? [],
          scenario: s.scenario?.title ?? '—',
          date: s.started_at ?? null,
          debriefUrl: `/solo/${s.id}/debrief?t=${p.token}`,
        });
      } catch {
        /* unscorable run is skipped */
      }
    }),
  );
  if (!built.length) return null;
  built.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  // aggregate the six normalised markers across runs that exercised them
  const acc = new Map<string, { label: string; values: number[]; conditions: Set<string> }>();
  for (const run of built) {
    for (const m of run.markers) {
      if (!m.exercised || m.normalized === null || m.tier !== 'A') continue;
      const cur = acc.get(m.key) ?? { label: m.label as string, values: [] as number[], conditions: new Set<string>() };
      cur.values.push(m.normalized as number);
      cur.conditions.add(run.condition);
      acc.set(m.key, cur);
    }
  }
  // always emit all six Tier-A markers. An aggregated marker at a ceiling (≥98) on a single-run
  // basis is a claim of certainty, not a reading — flag it insufficient. A marker never scored
  // (e.g. A5, or one the run gave no opportunity for) is an insufficient row, not a drop.
  const byKey = new Map<string, { label: string; values: number[]; conditions: Set<string> }>(acc);
  const markers: FingerprintMarker[] = A_MARKERS.map(([key, label]) => {
    const v = byKey.get(key);
    if (v && v.values.length) {
      const avg = Math.round(v.values.reduce((a, b) => a + b, 0) / v.values.length);
      const latest = v.values[v.values.length - 1];
      const trend = v.values.length >= 2 ? latest - v.values[v.values.length - 2] : null;
      const insufficient = avg >= 98 && v.values.length < 2; // ceiling on one run → not discriminating
      return { key, label: v.label ?? label, avg, latest, trend, n: v.values.length, conditions: [...v.conditions], confidence: confidenceOf(v.values.length, v.conditions.size), series: v.values, insufficient };
    }
    return { key, label, avg: 0, latest: 0, trend: null, n: 0, conditions: [], confidence: 'provisional', series: [], insufficient: true };
  });

  // signature strength / gap — only real, sufficient markers with repetition (n ≥ 2)
  const ranked = markers.filter((m) => m.n >= 2 && !m.insufficient).sort((a, b) => b.avg - a.avg);
  const strength = ranked.length ? { label: ranked[0].label, avg: ranked[0].avg, n: ranked[0].n } : null;
  const gap = ranked.length ? { label: ranked[ranked.length - 1].label, avg: ranked[ranked.length - 1].avg, n: ranked[ranked.length - 1].n } : null;

  const conditions = [...new Set(built.map((b) => b.condition))];
  // display order: real markers by rate (desc), insufficient ones last
  const sorted = [...markers].sort((a, b) => (Number(!!a.insufficient) - Number(!!b.insufficient)) || (b.avg - a.avg));
  return {
    runs: built.length,
    provisional: built.length < 2,
    conditions,
    markers: sorted,
    strength,
    gap: ranked.length >= 2 ? gap : null, // don't call something a gap when there's only one comparable marker
    trajectory: built.map((b) => b.overall),
    runLog: built
      .slice()
      .reverse()
      .map((b) => ({ sessionId: b.sessionId, scenario: b.scenario, score: b.overall, grade: b.grade, condition: b.condition, date: b.date, debriefUrl: b.debriefUrl })),
  };
}

/** Resolve the signed-in person's subject by email, then build their fingerprint. */
export async function buildFingerprintForEmail(email: string): Promise<Fingerprint | null> {
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', email.toLowerCase()).maybeSingle<any>();
  if (!subject) return null;
  return buildFingerprint(subject.id);
}
