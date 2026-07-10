import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { reconstitute } from '@/lib/solo-referee';
import { resolveAllWeeks } from '@/lib/solo-week';

// Solo Phase 5 — the game-film debrief (Master Handoff §7.5). The payoff read of a
// finished solo run, assembled from the append-only truth (events + rulings +
// run_drivers) against the authored content (documents:solo_content). Same Layer-1/2/3
// separation as the spine: nothing here mutates capture — it *interprets* the run.
//
//   • dimension scores      — aggregated across weekly rulings, normalized 0..100
//   • counterfactuals       — the holds you never surfaced (authored counterfactual_text)
//   • grouped coaching       — concrete "do differently" for your two weakest dimensions
//   • villain / hero ending  — resolved by the scenario's authored ending()/villainHero()
//   • game-film timeline     — every ask / reveal / miss / decision, tagged good/bad/key
//
// The authored logic (survived / villainHero / ending / COACH / driver fmt) is stored as
// { __fn: "<source>" } and reconstituted server-side (trusted, our own content).

export interface SoloDriverFinal {
  key: string;
  label: string;
  value: number;
  display: string;
}
export interface SoloDimRead {
  key: string;
  label: string;
  score: number;
  note: string;
}
export interface SoloCounterfactual {
  who: string;
  topic: string | null;
  text: string;
  critical: boolean;
}
export interface SoloFilmMoment {
  week: number;
  day: number | null;
  type: 'ask' | 'reveal' | 'hedge' | 'decision' | 'miss';
  text: string;
  cls: '' | 'good' | 'bad' | 'key';
  tag: string;
  note: string;
}
export interface SoloCoachBlock {
  key: string;
  label: string;
  score: number;
  lines: string[];
}
export interface SoloEnding {
  tone: 'hero' | 'villain' | 'mixed';
  tag: string;
  title: string;
  txt: string;
}
export interface SoloDebrief {
  sessionId: string;
  scenarioTitle: string;
  company: { name: string; sub?: string; logo?: string };
  survived: boolean;
  verdictTag: string;
  verdictHeadline: string;
  finalDrivers: SoloDriverFinal[];
  overall: number;
  grade: string;
  dims: SoloDimRead[];
  dispositionLabel: string;
  dispositionRead: string;
  ending: SoloEnding | null;
  villainHero: { heroWho: string; heroTxt: string; villainWho: string; villainTxt: string };
  counterfactuals: SoloCounterfactual[];
  surfacedCount: number;
  missedCount: number;
  gameFilm: SoloFilmMoment[];
  coaching: SoloCoachBlock[];
}

export type SoloDebriefResult =
  | { ok: true; debrief: SoloDebrief }
  | { ok: false; reason: 'not_found' | 'invalid_token' | 'no_content' | 'no_run' };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// engine-level prose (crisis-engine.js renderDebrief): the read of the team you walked
// in with, keyed by the run's disposition dial.
const DISPOSITION_READ: Record<string, string> = {
  served:
    'You walked in with a forthcoming team — the kind of openness a leader earns over time. They brought you the hard news without being asked. The question the program keeps asking: did you honor that trust, or spend it?',
  request:
    'You walked in with a team that answers honestly but volunteers nothing hard — a neutral starting trust. What you learned depended entirely on what you thought to ask. That is the most common team a leader actually has.',
  guarded:
    'You walked in with a guarded team — the kind you get after trust has been spent. They held the truth until pressed, and hedged even then. In the full program, this is not a setting; it is a consequence of how you’ve led before.',
};

export async function buildSoloDebrief(sessionId: string, token: string | undefined): Promise<SoloDebriefResult> {
  const db = createAdminClient();

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, run_config')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return { ok: false, reason: 'not_found' };
  if (!token) return { ok: false, reason: 'invalid_token' };

  // token-gated (any status — the debrief is read after the run, not only while live)
  const { data: participant } = await db
    .from('participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('token', token)
    .maybeSingle<any>();
  if (!participant) return { ok: false, reason: 'invalid_token' };
  const participantId = participant.id;

  const [{ data: scenario }, { data: contentDoc }, { data: rulings }, { data: driverRows }, { data: events }] =
    await Promise.all([
      db.from('scenarios').select('title').eq('id', session.scenario_id).maybeSingle<any>(),
      db.from('documents').select('body_json').eq('scenario_id', session.scenario_id).eq('key', 'solo_content').maybeSingle<any>(),
      db.from('rulings').select('week_idx, decision_text, dimension_scores, branch_key, buzzer').eq('session_id', sessionId).eq('participant_id', participantId).order('week_idx', { ascending: true }),
      db.from('run_drivers').select('week_idx, driver_key, value').eq('session_id', sessionId).eq('participant_id', participantId).order('week_idx', { ascending: false }),
      db.from('events').select('type, target, payload_json').eq('session_id', sessionId).eq('participant_id', participantId).order('scenario_ms', { ascending: true, nullsFirst: true }).order('ts', { ascending: true }),
    ]);

  const content = contentDoc?.body_json;
  if (!content) return { ok: false, reason: 'no_content' };
  const ruled = (rulings ?? []) as any[];
  if (!ruled.length) return { ok: false, reason: 'no_run' };

  const TEAM: any[] = content.TEAM ?? [];
  const DRIVERS = content.DRIVERS ?? {};
  const DIMENSIONS = content.DIMENSIONS ?? {};
  // the branch this run earned (from the deciding week's referee ruling) resolves
  // branched weeks (e.g. Week-4 held/caved) for whole-run hold accounting.
  const branch = [...ruled].reverse().map((r) => r.branch_key).find((b) => b) ?? null;
  const weeks: any[] = resolveAllWeeks(content, branch);
  const teamById = Object.fromEntries(TEAM.map((t) => [t.id, t]));
  const firstName = (id: string) => String(teamById[id]?.name ?? id).split(' ')[0];

  // ---- final driver values: latest week's value per key (rows ordered week desc) ----
  const finalVal: Record<string, number> = {};
  for (const r of (driverRows ?? []) as any[]) {
    if (finalVal[r.driver_key] === undefined && r.value !== null) finalVal[r.driver_key] = Number(r.value);
  }
  const driversNow: Record<string, number> = {};
  for (const k of Object.keys(DRIVERS)) driversNow[k] = finalVal[k] ?? DRIVERS[k].val;
  const finalDrivers: SoloDriverFinal[] = Object.keys(DRIVERS).map((k) => {
    const fmt = reconstitute(DRIVERS[k].fmt);
    let display: string;
    try {
      display = fmt ? String(fmt(driversNow[k])) : String(Math.round(driversNow[k]));
    } catch {
      display = String(Math.round(driversNow[k]));
    }
    return { key: k, label: DRIVERS[k].label, value: driversNow[k], display };
  });

  // ---- dimension aggregate → normalize 0..100 (range per dim: -2..2 per week) ----
  const dimKeys = Object.keys(DIMENSIONS);
  const agg = Object.fromEntries(dimKeys.map((k) => [k, 0]));
  for (const r of ruled) {
    const ds = (r.dimension_scores ?? {}) as Record<string, number>;
    for (const k of dimKeys) agg[k] += ds[k] ?? 0;
  }
  const wk = ruled.length || 1;
  const dimScore: Record<string, number> = Object.fromEntries(
    dimKeys.map((k) => [k, clamp(Math.round(((agg[k] + 2 * wk) / (4 * wk)) * 100), 0, 100)]),
  );
  const overall = Math.round(dimKeys.reduce((s, k) => s + dimScore[k], 0) / (dimKeys.length || 1));
  const grade = overall >= 80 ? 'Exemplary' : overall >= 65 ? 'Strong' : overall >= 50 ? 'Mixed' : overall >= 35 ? 'Concerning' : 'Failing';

  // ---- survived / verdict ----
  const survivedFn = reconstitute(content.survived);
  let survived: boolean;
  try {
    survived = survivedFn ? !!survivedFn(driversNow) : Object.keys(DRIVERS).every((k) => driversNow[k] >= 25);
  } catch {
    survived = Object.keys(DRIVERS).every((k) => driversNow[k] >= 25);
  }
  const V = content.VERDICT ?? {};
  const verdictTag = survived ? V.surviveTag ?? 'You came through' : V.failTag ?? 'You did not make it';
  const verdictHeadline = survived ? V.survive ?? 'Still standing — changed, and intact.' : V.fail ?? 'It could not be held together.';

  // ---- holds surfaced (Set keyed "<week>:<advisorId>") from the event log ----
  const evs = (events ?? []) as any[];
  const holdsSurfaced = new Set<string>();
  const everContacted = new Set<string>();
  for (const e of evs) {
    if (e.type === 'hold_surfaced') holdsSurfaced.add(`${e.payload_json?.week}:${e.target}`);
    if (e.type === 'message_sent' && teamById[e.target]) everContacted.add(e.target);
  }
  const holdsAll = weeks.flatMap((w) => (w.holds ?? []).map((h: any) => ({ ...h, weekN: w.n })));
  const missedHolds = holdsAll.filter((h) => !holdsSurfaced.has(`${h.weekN}:${h.from}`));
  const surfacedHolds = holdsAll.filter((h) => holdsSurfaced.has(`${h.weekN}:${h.from}`));

  // ---- ending: scenario names the version earned (branch resolved above) ----
  const endingFn = reconstitute(content.ending);
  let ending: SoloEnding | null = null;
  try {
    const e = endingFn ? endingFn({ branch, survived, dimScore, holdsSurfaced, drivers: driversNow }) : null;
    if (e && (e.title || e.txt)) ending = { tone: e.tone ?? (survived ? 'hero' : 'villain'), tag: e.tag ?? '', title: e.title ?? '', txt: e.txt ?? '' };
  } catch {
    ending = null;
  }

  // ---- villain / hero framing (scenario supplies the prose; keyed on the read) ----
  const vhFn = reconstitute(content.villainHero);
  let vh: any = {};
  try {
    vh = vhFn ? vhFn(dimScore) : {};
  } catch {
    vh = {};
  }
  const villainHero = {
    heroWho: vh.heroWho ?? 'To the people who had no vote',
    heroTxt: vh.heroTxt ?? '',
    villainWho: vh.villainWho ?? 'To the people you led',
    villainTxt: vh.villainTxt ?? '',
  };

  // ---- dimension reads ----
  const DIMNOTE = content.DIMNOTE ?? {};
  const dims: SoloDimRead[] = dimKeys.map((k) => ({ key: k, label: DIMENSIONS[k], score: dimScore[k], note: DIMNOTE[k] ?? '' }));

  // ---- counterfactuals: holds never surfaced ----
  const counterfactuals: SoloCounterfactual[] = missedHolds.map((h) => ({
    who: teamById[h.from]?.name ?? h.from,
    topic: h.topic ?? null,
    text: h.counterfactual ?? h.counterfactual_text ?? '',
    critical: !!h.critical,
  }));

  // ---- grouped coaching for the two weakest dimensions (authored COACH fns) ----
  const buzzerCount = ruled.filter((r) => r.buzzer).length;
  const neverContacted = TEAM.filter((t) => !everContacted.has(t.id)).map((t) => String(t.name).split(' ')[0]);
  const missNames = [...new Set(missedHolds.map((h) => firstName(h.from)))];
  const coachCtx = { neverContacted, buzzerCount, missedHolds, missNames, teamById, dimScore, drivers: driversNow };
  const COACH = content.COACH ?? {};
  const weakest = dimKeys.slice().sort((a, b) => dimScore[a] - dimScore[b]).slice(0, 2);
  const coaching: SoloCoachBlock[] = weakest.map((k) => {
    const fn = reconstitute(COACH[k]);
    let lines: string[] = [];
    try {
      lines = fn ? (fn(coachCtx) as string[]) : [];
    } catch {
      lines = [];
    }
    return { key: k, label: DIMENSIONS[k], score: dimScore[k], lines: (lines ?? []).filter(Boolean) };
  });

  // ---- game-film: every ask / reveal / hedge / decision, tagged; + misses ----
  const gameFilm: SoloFilmMoment[] = [];
  for (const e of evs) {
    const p = e.payload_json ?? {};
    if (e.type === 'message_sent' && teamById[e.target]) {
      gameFilm.push({
        week: p.week ?? 0,
        day: null,
        type: 'ask',
        text: `You reached out to ${teamById[e.target].name}${p.body ? ` — “${p.body}”` : ''}`,
        cls: 'good',
        tag: '✓ You reached out',
        note: 'Asking instead of assuming.',
      });
    } else if (e.type === 'message_sent' && e.target === 'decision') {
      gameFilm.push({
        week: p.week ?? 0,
        day: p.decidedDay ?? null,
        type: 'decision',
        text: `Your call — “${p.body ?? ''}”`,
        cls: 'key',
        tag: 'Your decision',
        note: p.underBuzzer ? 'Forced to the buzzer.' : '',
      });
    } else if (e.type === 'hold_surfaced') {
      gameFilm.push({
        week: p.week ?? 0,
        day: null,
        type: 'reveal',
        text: `${teamById[e.target]?.name ?? e.target} surfaced what they were holding${p.topic ? `: ${p.topic}` : ''}`,
        cls: 'good',
        tag: '✓ You surfaced this',
        note: 'You pulled it into the open before deciding — exactly the move.',
      });
    } else if (e.type === 'hold_hedged') {
      gameFilm.push({
        week: p.week ?? 0,
        day: null,
        type: 'hedge',
        text: `${teamById[e.target]?.name ?? e.target} hedged${p.topic ? ` on ${p.topic}` : ''} — you didn’t press`,
        cls: 'bad',
        tag: '⚑ They held back',
        note: 'Under a guarded team, the first ask only hedges. Press again.',
      });
    }
  }
  for (const h of missedHolds) {
    gameFilm.push({
      week: h.weekN,
      day: null,
      type: 'miss',
      text: `${teamById[h.from]?.name ?? h.from} was holding ${h.topic ? `“${h.topic}”` : 'something decisive'} — you never asked`,
      cls: 'bad',
      tag: '✗ Left on the table',
      note: 'Decided without it.',
    });
  }
  const typeRank: Record<string, number> = { ask: 1, reveal: 2, hedge: 3, miss: 4, decision: 5 };
  gameFilm.sort((a, b) => a.week - b.week || typeRank[a.type] - typeRank[b.type]);

  const disposition = session.run_config?.disposition ?? 'request';
  const dispLabel = content.DISPOSITIONS?.[disposition]?.label ?? disposition;

  return {
    ok: true,
    debrief: {
      sessionId,
      scenarioTitle: scenario?.title ?? 'Scenario',
      company: content.COMPANY ?? { name: scenario?.title ?? '' },
      survived,
      verdictTag,
      verdictHeadline,
      finalDrivers,
      overall,
      grade,
      dims,
      dispositionLabel: dispLabel,
      dispositionRead: DISPOSITION_READ[disposition] ?? '',
      ending,
      villainHero,
      counterfactuals,
      surfacedCount: surfacedHolds.length,
      missedCount: missedHolds.length,
      gameFilm,
      coaching,
    },
  };
}
