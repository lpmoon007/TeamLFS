import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { reconstitute } from '@/lib/solo-referee';
import { resolveAllWeeks } from '@/lib/solo-week';
import { applyLens, type LensRead } from '@/lib/lens/ldol';
import { lensHistoryForParticipant } from '@/lib/spine';

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
export interface SoloPanelMarker {
  key: string;
  label: string;
  tier: 'A' | 'B';
  raw: number | null;
  normalized: number | null;
  confidence: string;
  exercised: boolean;
  percentile: number | null; // vs cohort — null until the cohort matures
  band: { p10: number; p50: number; p90: number } | null; // reference range (provisional-safe)
}
export interface SoloPanelRead {
  tierA: number | null;
  tierB: number | null;
  quadrant: string; // multiplier | lone_genius | connector | struggling | na
  provisional: boolean; // cohort not yet mature → percentiles withheld
  cohortN: number; // how many peer runs the ranges are built from
  markers: SoloPanelMarker[]; // Tier A markers, ordered A1..A6 (Tier B is n/a in solo)
}
export interface SoloDebrief {
  sessionId: string;
  scenarioTitle: string;
  contentVersion: number; // the scenario content version this run was played on
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
  lens: LensRead | null; // Layer-3 LDOL read over the spine trait scores (if scored)
  panel: SoloPanelRead | null; // Behavioral Panel (Two-Tier Spec) — Tier A draw for this run
  divergence: import('@/lib/divergence').Divergence | null; // cross-session Tier A × Tier B quadrant
  // team-cast (solo-as-team) only: the room's collective Tier B + this seat's contribution
  teamCast: boolean;
  teamBoard: { healthIndex: number | null; metrics: { key: string; label: string; score: number | null; exercised: boolean; note: string }[] } | null;
  myTierB: { tierB: number | null; markers: { key: string; label: string; normalized: number | null; exercised: boolean }[] } | null;
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

/** Is this session a solo run? (server-only; no facilitator guard so it composes with
 *  the debrief page's own ?key= gate). */
export async function isSoloSession(sessionId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return false;
  const { data: meta } = await db.from('scenario_meta').select('mode_default').eq('scenario_id', session.scenario_id).maybeSingle<any>();
  return meta?.mode_default === 'solo';
}

/** Participant-facing: token-gated to the CEO's own run. */
export async function buildSoloDebrief(sessionId: string, token: string | undefined): Promise<SoloDebriefResult> {
  const db = createAdminClient();
  const { data: session } = await db.from('sessions').select('id, scenario_id, run_config, content_version').eq('id', sessionId).maybeSingle<any>();
  if (!session) return { ok: false, reason: 'not_found' };
  if (!token) return { ok: false, reason: 'invalid_token' };

  // token-gated (any status — the debrief is read after the run, not only while live)
  const { data: participant } = await db.from('participants').select('id').eq('session_id', sessionId).eq('token', token).maybeSingle<any>();
  if (!participant) return { ok: false, reason: 'invalid_token' };
  return buildSoloDebriefCore(db, session, participant.id);
}

/** Facilitator-facing (Phase 8): resolves the human CEO seat, no token needed. The
 *  caller must gate on the facilitator cookie. */
export async function buildSoloDebriefForFacilitator(sessionId: string): Promise<SoloDebriefResult> {
  const db = createAdminClient();
  const { data: session } = await db.from('sessions').select('id, scenario_id, run_config, content_version').eq('id', sessionId).maybeSingle<any>();
  if (!session) return { ok: false, reason: 'not_found' };

  // the CEO hot seat is the human occupant (advisors are AI-cast). Fall back to any
  // participant that actually ruled decisions.
  const { data: human } = await db.from('participants').select('id').eq('session_id', sessionId).eq('cast_kind', 'human').maybeSingle<any>();
  const participantId = human?.id ?? (await db.from('participants').select('id').eq('session_id', sessionId).limit(1).maybeSingle<any>()).data?.id;
  if (!participantId) return { ok: false, reason: 'no_run' };
  return buildSoloDebriefCore(db, session, participantId);
}

async function buildSoloDebriefCore(
  db: ReturnType<typeof createAdminClient>,
  session: any,
  viewerId: string,
): Promise<SoloDebriefResult> {
  const sessionId: string = session.id;

  // team-cast: the run's scored artifacts (rulings, drivers, panel, lens, spine) all live
  // under the CEO seat's participant — the run owner — so every seat sees the same run
  // debrief. Plain solo: the viewer IS the owner. (Per-person Tier B is layered on separately.)
  let participantId = viewerId;
  if (session.run_config?.team_cast) {
    const { data: owner } = await db
      .from('participants')
      .select('id, seat:seats!inner(key)')
      .eq('session_id', sessionId)
      .eq('seat.key', 'ceo')
      .maybeSingle<any>();
    if (owner?.id) participantId = owner.id;
  }

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

  // Layer-3 LDOL lens over the spine trait scores this run produced (scoreSoloRun at
  // the final decision). Absent until the run is scored → lens stays null.
  let lens: LensRead | null = null;
  const { data: traitRows } = await db
    .from('trait_scores')
    .select('trait_key, value, value_num, confidence, evidence_event_ids, scorer_version, coder, created_at')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .neq('coder', 'human')
    .order('created_at', { ascending: false });
  const seen = new Set<string>();
  const traits = ((traitRows ?? []) as any[]).filter((r) => (seen.has(r.trait_key) ? false : (seen.add(r.trait_key), true)));
  if (traits.length) {
    const history = await lensHistoryForParticipant(db, sessionId, participantId);
    lens = applyLens({ traits, omissions: { count: missedHolds.length, names: [...new Set(missedHolds.map((h: any) => firstName(h.from)))] }, history });
  }

  // Behavioral Panel — the run's Tier-A draw (persistSoloPanel writes it at final
  // decision). Latest row wins (replace-on-rescore). Absent → panel stays null.
  let panel: SoloPanelRead | null = null;
  const { data: panelRow } = await db
    .from('behavioral_panel')
    .select('markers, tier_a, tier_b, quadrant, provisional')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<any>();
  if (panelRow) {
    const m = (panelRow.markers ?? {}) as Record<string, any>;
    const order = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
    // reference ranges (Two-Tier Spec §9): prefer this scenario's cohort, fall back to all.
    const { readNormsMap, readMarkerNorm } = await import('@/lib/panel-norms');
    const cohorts = [`scenario:${session.scenario_id}`, 'all'];
    const norms = await readNormsMap(db, cohorts);
    let cohortN = 0;
    let anyMature = false;
    const markers = order
      .map((k) => m[k])
      .filter(Boolean)
      .map((x: any) => {
        const norm = readMarkerNorm(norms, cohorts, x.key, x.exercised ? x.normalized : null);
        if (norm) cohortN = Math.max(cohortN, norm.n);
        if (norm && !norm.provisional) anyMature = true;
        return {
          key: x.key,
          label: x.label,
          tier: x.tier,
          raw: x.raw,
          normalized: x.normalized,
          confidence: x.confidence,
          exercised: x.exercised,
          percentile: norm?.percentile ?? null,
          band: norm ? { p10: norm.p10, p50: norm.p50, p90: norm.p90 } : null,
        };
      });
    panel = {
      tierA: panelRow.tier_a !== null && panelRow.tier_a !== undefined ? Number(panelRow.tier_a) : null,
      tierB: panelRow.tier_b !== null && panelRow.tier_b !== undefined ? Number(panelRow.tier_b) : null,
      quadrant: panelRow.quadrant ?? 'na',
      provisional: !anyMature,
      cohortN,
      markers,
    };
  }

  // Cross-session divergence quadrant (Two-Tier Spec §5): this person's solo Tier A ×
  // team Tier B, read off their subject spine. Absent (null) when we can't resolve a
  // stable identity for the seat.
  let divergence: import('@/lib/divergence').Divergence | null = null;
  const { subjectForParticipant } = await import('@/lib/spine');
  const subjectId = await subjectForParticipant(db, sessionId, participantId);
  if (subjectId) {
    const { subjectDivergence } = await import('@/lib/divergence');
    divergence = await subjectDivergence(db, subjectId);
  }

  // team-cast: the room's Tier-B board + THIS seat's (viewerId) teaming contribution.
  const teamCast = !!session.run_config?.team_cast;
  let teamBoard: SoloDebrief['teamBoard'] = null;
  let myTierB: SoloDebrief['myTierB'] = null;
  if (teamCast) {
    const { buildSoloTeamBoard, soloTeamSeatTierB } = await import('@/lib/solo-team-panel');
    const board = await buildSoloTeamBoard(sessionId);
    if (board) {
      teamBoard = {
        healthIndex: board.healthIndex,
        metrics: ['airtime', 'resilience', 'coverage', 'safety'].map((k) => {
          const m = board.metrics[k];
          return { key: k, label: m.label, score: m.score, exercised: m.exercised, note: m.note };
        }),
      };
    }
    const seatB = await soloTeamSeatTierB(sessionId, viewerId);
    if (seatB) myTierB = { tierB: seatB.tierB, markers: seatB.markers.map((m) => ({ key: m.key, label: m.label, normalized: m.normalized, exercised: m.exercised })) };
  }

  return {
    ok: true,
    debrief: {
      sessionId,
      scenarioTitle: scenario?.title ?? 'Scenario',
      contentVersion: Number(session.content_version ?? 1),
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
      lens,
      panel,
      divergence,
      teamCast,
      teamBoard,
      myTierB,
    },
  };
}
