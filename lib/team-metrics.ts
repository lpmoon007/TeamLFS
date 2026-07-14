// Tier B — the "team as one" derivations (Team Event-Log Spec §1-4). PURE over the
// event stream: no server-only imports, no I/O, so it unit-tests directly against
// hand-built streams (Spec §5 build order step 3). The emission that POPULATES this
// stream from the team app is separate; this is the contract, lifted verbatim from the
// spec so the metric definitions never drift inside the app.
//
// One session = one append-only array of these envelopes (Spec §1). Aggregates are
// derived here at debrief; the stream is the ground truth.

export type TeamPhase = 'brief' | 'deliberate' | 'decide' | 'transition';
export type TeamEventType =
  | 'message'
  | 'read'
  | 'ask'
  | 'answer'
  | 'hold_surface'
  | 'proposal'
  | 'stance'
  | 'decision_lock'
  | 'pressure'
  | 'silence_tick';

/** The one envelope every Tier-B event carries (Spec §1). `t` is ms since session start
 *  (monotonic, server-authoritative) — every metric is a function of ordering and gaps. */
export interface TeamEvent {
  t: number;
  week: number;
  phase: TeamPhase;
  actor: string; // seat id ('system' for engine/Director events)
  type: TeamEventType;
  target?: string | null; // seat id / hold id / null
  ref?: string | null; // hold key / decision id / thread id
  meta?: Record<string, any>;
}

export interface SeatRef {
  id: string;
  ai: boolean; // AI-cast seats measure the simulation, not the team (Spec §6)
}
export interface HoldRef {
  key: string; // e.g. 'w2:cfo'
  week: number;
}

export interface TeamMetric {
  key: 'airtime' | 'resilience' | 'coverage' | 'safety';
  label: string;
  score: number | null; // 0..100, null when not exercised (Spec §2 honesty rule)
  exercised: boolean;
  note: string; // human-readable read (direction/magnitude in words, per §3.4)
  evidence: Record<string, any>; // raw for the debrief board
}
export interface TeamMetricsResult {
  metrics: Record<string, TeamMetric>;
  healthIndex: number | null; // weighted mean of the four (Spec §4), null if all n/a
  mixedRoom: boolean; // any AI-cast seat present (Spec §6 board label)
}

const round = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ---- 3.1 Airtime equality -----------------------------------------------------
// Contribution weight per seat: message/ask/answer/proposal/stance each count; messages
// weighted by chars (capped so one long post ≠ ten reactions). Gini over the
// distribution → score = 100·(1 − Gini). AI seats excluded (Spec §6).

const MSG_CAP = 600; // chars — cap one post's weight so airtime ≈ participation, not verbosity
const CONTRIB_TYPES = new Set(['message', 'ask', 'answer', 'proposal', 'stance']);

function gini(values: number[]): number {
  const xs = values.filter((v) => v >= 0);
  const n = xs.length;
  const sum = xs.reduce((a, b) => a + b, 0);
  if (n === 0 || sum === 0) return 0; // no contribution anywhere → treat as even (0)
  let num = 0;
  for (const a of xs) for (const b of xs) num += Math.abs(a - b);
  return num / (2 * n * sum); // = num / (2 n^2 mean)
}

function airtime(stream: TeamEvent[], seats: SeatRef[]): TeamMetric {
  const human = seats.filter((s) => !s.ai);
  const weight = new Map(human.map((s) => [s.id, 0]));
  for (const e of stream) {
    if (!CONTRIB_TYPES.has(e.type)) continue;
    if (!weight.has(e.actor)) continue; // ignore AI/system actors
    const w = e.type === 'message' ? Math.min(MSG_CAP, Math.max(1, Number(e.meta?.chars) || 1)) / 60 : 1;
    weight.set(e.actor, (weight.get(e.actor) as number) + w);
  }
  const dist = human.map((s) => weight.get(s.id) as number);
  const total = dist.reduce((a, b) => a + b, 0);
  const exercised = human.length >= 2 && total > 0;
  const g = gini(dist);
  const shares = human.map((s, i) => ({ seat: s.id, share: total ? dist[i] / total : 0 }));
  const score = exercised ? round(100 * (1 - g)) : null;
  return {
    key: 'airtime',
    label: 'Airtime equality',
    score,
    exercised,
    note: !exercised
      ? 'Not enough human contribution to read the balance of the floor.'
      : g < 0.2
        ? 'The room shared the floor evenly.'
        : g < 0.4
          ? 'One or two voices carried more than their share.'
          : 'The floor was dominated — most of the room barely spoke.',
    evidence: { gini: Number(g.toFixed(3)), shares },
  };
}

// ---- 3.2 Resilience under stress (the flagship) -------------------------------
// Window into stress episodes: each pressure(severity≥2) until the next decision_lock
// (or +90s). Within, count distinct options with ≥1 non-author stance ("considered").
// diversity = considered options / seats active in the episode, clamped. Score =
// 100·mean(diversity). No stress episodes → NOT EXERCISED (never 0).

const EPISODE_MS = 90_000;

function resilience(stream: TeamEvent[], seats: SeatRef[]): TeamMetric {
  const sorted = [...stream].sort((a, b) => a.t - b.t);
  const stressors = sorted.filter((e) => e.type === 'pressure' && Number(e.meta?.severity) >= 2);
  const locks = sorted.filter((e) => e.type === 'decision_lock');
  const episodes: { start: number; end: number }[] = stressors.map((s) => {
    const nextLock = locks.find((l) => l.t >= s.t);
    return { start: s.t, end: Math.min(nextLock ? nextLock.t : Infinity, s.t + EPISODE_MS) };
  });
  if (!episodes.length) {
    return {
      key: 'resilience',
      label: 'Resilience under stress',
      score: null,
      exercised: false,
      note: 'No high-pressure episode arose this session — resilience was not put to the test.',
      evidence: { episodes: [] },
    };
  }
  const humanIds = new Set(seats.filter((s) => !s.ai).map((s) => s.id));
  const details: any[] = [];
  const diversities: number[] = [];
  for (const ep of episodes) {
    const inWin = sorted.filter((e) => e.t >= ep.start && e.t <= ep.end);
    const proposals = inWin.filter((e) => e.type === 'proposal');
    const stances = inWin.filter((e) => e.type === 'stance');
    // an option is "considered" if a non-author put a stance on it
    const authorOf = new Map<string, string>();
    for (const p of proposals) if (p.meta?.optionId) authorOf.set(String(p.meta.optionId), p.actor);
    const considered = new Set<string>();
    for (const s of stances) {
      const opt = String(s.meta?.optionId ?? '');
      if (opt && authorOf.has(opt) && s.actor !== authorOf.get(opt)) considered.add(opt);
    }
    const activeSeats = new Set(inWin.map((e) => e.actor).filter((a) => humanIds.has(a)));
    const denom = Math.max(1, activeSeats.size);
    const diversity = clamp(considered.size / denom, 0, 1);
    diversities.push(diversity);
    details.push({ start: ep.start, end: ep.end, options: proposals.length, considered: considered.size, activeSeats: activeSeats.size });
  }
  const mean = diversities.reduce((a, b) => a + b, 0) / diversities.length;
  const score = round(100 * mean);
  return {
    key: 'resilience',
    label: 'Resilience under stress',
    score,
    exercised: true,
    note:
      score >= 60
        ? 'Under pressure the room still put up genuine alternatives — error-correction held exactly when it was needed.'
        : score >= 35
          ? 'Some alternatives surfaced under pressure, but the room narrowed fast.'
          : 'Under pressure the room converged on one reflex — no competing option drew real consideration.',
    evidence: { episodes: details },
  };
}

// ---- 3.3 Information coverage -------------------------------------------------
// Denominator = holds authored for the session. Numerator = distinct holds with a
// hold_surface BEFORE the decision_lock of their week. Credit is collective. Bonus:
// pulled (someone asked) vs volunteered.

function coverage(stream: TeamEvent[], holds: HoldRef[]): TeamMetric {
  if (!holds.length) {
    return {
      key: 'coverage',
      label: 'Information coverage',
      score: null,
      exercised: false,
      note: 'This session authored no held information to surface.',
      evidence: { total: 0, surfaced: 0 },
    };
  }
  const lockByWeek = new Map<number, number>();
  for (const e of stream) if (e.type === 'decision_lock') lockByWeek.set(e.week, Math.min(lockByWeek.get(e.week) ?? Infinity, e.t));
  const surfaces = stream.filter((e) => e.type === 'hold_surface');
  const surfacedInTime = new Set<string>();
  let pulled = 0;
  let volunteered = 0;
  for (const h of holds) {
    const lock = lockByWeek.get(h.week) ?? Infinity;
    const hit = surfaces.find((s) => String(s.meta?.hold ?? s.ref) === h.key && s.t <= lock);
    if (hit) {
      surfacedInTime.add(h.key);
      if (hit.meta?.route === 'pulled') pulled++;
      else volunteered++;
    }
  }
  const score = round(100 * (surfacedInTime.size / holds.length));
  return {
    key: 'coverage',
    label: 'Information coverage',
    score,
    exercised: true,
    note:
      score >= 75
        ? 'The room surfaced most of what was held before deciding — collective digging worked.'
        : score >= 40
          ? 'The room surfaced some held facts but decided over others.'
          : 'Most of the held information never reached the room before the call.',
    evidence: { total: holds.length, surfaced: surfacedInTime.size, pulled, volunteered },
  };
}

// ---- 3.4 Safety trajectory (proxy) --------------------------------------------
// Proxy for psychological safety = does candor hold to the end. Split first-third /
// last-third by t. Dissent rate = stance(valence −1) + challenging asks, per active
// seat, per third. Trajectory = last-third − first-third. Score = 50 + 50·slope.

function safety(stream: TeamEvent[], seats: SeatRef[]): TeamMetric {
  const sorted = [...stream].sort((a, b) => a.t - b.t);
  if (sorted.length < 2) {
    return { key: 'safety', label: 'Safety trajectory', score: null, exercised: false, note: 'Too little interaction to read a candor trend.', evidence: {} };
  }
  const humanIds = new Set(seats.filter((s) => !s.ai).map((s) => s.id));
  const t0 = sorted[0].t;
  const span = sorted[sorted.length - 1].t - t0 || 1;
  const dissentIn = (loT: number, hiT: number) => {
    const win = sorted.filter((e) => e.t >= loT && e.t < hiT);
    const dissents = win.filter(
      (e) => (e.type === 'stance' && Number(e.meta?.valence) === -1) || (e.type === 'ask' && e.meta?.challenge === true),
    ).length;
    const active = new Set(win.map((e) => e.actor).filter((a) => humanIds.has(a)));
    return dissents / Math.max(1, active.size);
  };
  const first = dissentIn(t0, t0 + span / 3);
  const last = dissentIn(t0 + (2 * span) / 3, t0 + span + 1);
  const anyDissent = sorted.some((e) => (e.type === 'stance' && Number(e.meta?.valence) === -1) || (e.type === 'ask' && e.meta?.challenge === true));
  if (!anyDissent) {
    return {
      key: 'safety',
      label: 'Safety trajectory',
      score: null,
      exercised: false,
      note: 'No dissent or challenge was recorded — candor cannot be tracked (this itself may be worth a look).',
      evidence: { firstThird: 0, lastThird: 0 },
    };
  }
  // normalize slope to ~[-1, 1] against the larger of the two rates
  const scale = Math.max(first, last, 0.5);
  const slope = clamp((last - first) / scale, -1, 1);
  const score = clamp(round(50 + 50 * slope), 0, 100);
  return {
    key: 'safety',
    label: 'Safety trajectory',
    score,
    exercised: true,
    note:
      slope > 0.15
        ? 'Candor rose as the pressure came on — people still spoke up late, the mark of a safe room.'
        : slope < -0.15
          ? 'Candor collapsed toward the end — dissent died just when the stakes peaked. Usually the real story behind a bad call.'
          : 'Candor held roughly flat from open to close.',
    evidence: { firstThird: Number(first.toFixed(2)), lastThird: Number(last.toFixed(2)), slope: Number(slope.toFixed(2)) },
  };
}

// ---- Team Collective Health Index (Spec §4) -----------------------------------
// Weighted mean of the four; resilience weighted highest (no individual proxy). Only
// exercised metrics count toward the index (weights renormalized over what was tested).
const WEIGHTS: Record<string, number> = { airtime: 0.2, resilience: 0.35, coverage: 0.3, safety: 0.15 };

export function deriveTeamMetrics(stream: TeamEvent[], holds: HoldRef[], seats: SeatRef[]): TeamMetricsResult {
  const metrics = [airtime(stream, seats), resilience(stream, seats), coverage(stream, holds), safety(stream, seats)];
  let num = 0;
  let den = 0;
  for (const m of metrics) {
    if (m.exercised && m.score !== null) {
      num += m.score * WEIGHTS[m.key];
      den += WEIGHTS[m.key];
    }
  }
  return {
    metrics: Object.fromEntries(metrics.map((m) => [m.key, m])),
    healthIndex: den ? round(num / den) : null,
    mixedRoom: seats.some((s) => s.ai),
  };
}
