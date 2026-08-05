import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSoloDebrief } from '@/lib/solo-debrief';

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
}
export interface FingerprintRun {
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
  const { data: parts } = await db
    .from('participants')
    .select('token, session:sessions!inner(id, run_config, started_at, scenario_id, scenario:scenarios!inner(title))')
    .eq('subject_id', subjectId)
    .not('token', 'is', null);
  const rows = (parts ?? []).filter((p: any) => p.session);
  if (!rows.length) return null;

  // week counts, to tell a finished run from one in progress
  const scnIds = [...new Set(rows.map((p: any) => p.session.scenario_id))];
  const weekBy = new Map<string, number>();
  if (scnIds.length) {
    const { data: metas } = await db.from('scenario_meta').select('scenario_id, week_count').in('scenario_id', scnIds);
    for (const m of metas ?? []) if ((m as any).week_count) weekBy.set((m as any).scenario_id, (m as any).week_count);
  }

  // build each debrief once; keep only finished, scored runs, oldest → newest
  type Built = { overall: number; grade: string; condition: string; markers: any[]; scenario: string; date: string | null; debriefUrl: string };
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
  const markers: FingerprintMarker[] = [...acc.entries()].map(([key, v]) => {
    const avg = Math.round(v.values.reduce((a, b) => a + b, 0) / v.values.length);
    const latest = v.values[v.values.length - 1];
    const trend = v.values.length >= 2 ? latest - v.values[v.values.length - 2] : null;
    return { key, label: v.label, avg, latest, trend, n: v.values.length, conditions: [...v.conditions], confidence: confidenceOf(v.values.length, v.conditions.size), series: v.values };
  });

  // signature strength / gap — only from markers with real repetition (n ≥ 2)
  const ranked = markers.filter((m) => m.n >= 2).sort((a, b) => b.avg - a.avg);
  const strength = ranked.length ? { label: ranked[0].label, avg: ranked[0].avg, n: ranked[0].n } : null;
  const gap = ranked.length ? { label: ranked[ranked.length - 1].label, avg: ranked[ranked.length - 1].avg, n: ranked[ranked.length - 1].n } : null;

  const conditions = [...new Set(built.map((b) => b.condition))];
  return {
    runs: built.length,
    provisional: built.length < 2,
    conditions,
    markers: markers.sort((a, b) => b.avg - a.avg),
    strength,
    gap: ranked.length >= 2 ? gap : null, // don't call something a gap when there's only one comparable marker
    trajectory: built.map((b) => b.overall),
    runLog: built
      .slice()
      .reverse()
      .map((b) => ({ scenario: b.scenario, score: b.overall, grade: b.grade, condition: b.condition, date: b.date, debriefUrl: b.debriefUrl })),
  };
}

/** Resolve the signed-in person's subject by email, then build their fingerprint. */
export async function buildFingerprintForEmail(email: string): Promise<Fingerprint | null> {
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', email.toLowerCase()).maybeSingle<any>();
  if (!subject) return null;
  return buildFingerprint(subject.id);
}
