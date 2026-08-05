'use server';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, VOICE_MODEL } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFacilitatorSession } from '@/lib/facilitator-session';
import { currentFacilitator } from '@/lib/auth';
import { buildFingerprint } from '@/lib/profile/fingerprint';
import { getLedger } from '@/lib/profile/ledger';

// The six Tier-A markers a rep can target (Screen-14 §2 — target_marker is required).
const MARKER_LABEL: Record<string, string> = {
  A1: 'Information-seeking', A2: 'Decision calibration', A3: 'Consultation breadth',
  A4: 'Truth-seeking over comfort', A5: 'Intent–action integrity', A6: 'Composure under escalation',
};

// The 30-day behavioral challenge — the bridge from the debrief's insight to real change.
// After a run, the leader commits to one habit (drawn from their weakest read) and can log
// check-ins as they practice it. Owned by the participant who ran the crisis, resolved from
// the solo token (participant) or the facilitator cookie (the human seat). Same admin-client
// pattern as the rest of the solo actions — the service role is the only reader/writer.

export interface ChallengeCheckin {
  id: string;
  did: boolean;
  rating: number | null; // 1–10 effort rating (Screen-14 §5)
  day: number | null;    // 1–30
  note: string | null;
  createdAt: string;
}
export interface Challenge {
  id: string;
  behavior: string;
  cue: string | null;
  focusKey: string | null;
  focusLabel: string | null;
  targetDays: number;
  status: string;
  createdAt: string;
  dayNumber: number; // 1-based day of the challenge (calendar days since start, capped at target)
  checkins: ChallengeCheckin[];
}

/** Resolve who owns a challenge for this session: the token's participant, or (facilitator)
 *  the human seat. Returns null when the caller can't be identified. */
async function resolveParticipant(db: ReturnType<typeof createAdminClient>, sessionId: string, token?: string): Promise<string | null> {
  if (token) {
    const { data } = await db.from('participants').select('id').eq('session_id', sessionId).eq('token', token).maybeSingle<any>();
    return data?.id ?? null;
  }
  if (await isFacilitatorSession()) {
    const { data } = await db.from('participants').select('id').eq('session_id', sessionId).eq('cast_kind', 'human').maybeSingle<any>();
    return data?.id ?? null;
  }
  return null;
}

function dayNumber(createdAt: string, targetDays: number): number {
  const start = new Date(createdAt).getTime();
  const days = Math.floor((Date.now() - start) / 86_400_000) + 1; // day 1 is the day you commit
  return Math.max(1, Math.min(targetDays, days));
}

async function hydrate(db: ReturnType<typeof createAdminClient>, row: any): Promise<Challenge> {
  const { data: checkins } = await db
    .from('challenge_checkins')
    .select('id, did, rating, day, note, created_at')
    .eq('challenge_id', row.id)
    .order('created_at', { ascending: true });
  return {
    id: row.id,
    behavior: row.behavior,
    cue: row.cue ?? null,
    focusKey: row.focus_key ?? null,
    focusLabel: row.focus_label ?? null,
    targetDays: row.target_days ?? 30,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    dayNumber: dayNumber(row.created_at, row.target_days ?? 30),
    checkins: (checkins ?? []).map((c: any) => ({ id: c.id, did: c.did, rating: c.rating ?? null, day: c.day ?? null, note: c.note ?? null, createdAt: c.created_at })),
  };
}

/** The active challenge for this run, if the caller has one. Drives the debrief's
 *  "you're on a challenge" panel (day counter + check-in log). */
export async function getSessionChallenge(params: { sessionId: string; token?: string }): Promise<{ ok: boolean; challenge: Challenge | null }> {
  const db = createAdminClient();
  const participantId = await resolveParticipant(db, params.sessionId, params.token);
  if (!participantId) return { ok: false, challenge: null };
  const { data: row } = await db
    .from('challenges')
    .select('*')
    .eq('session_id', params.sessionId)
    .eq('participant_id', participantId)
    .neq('status', 'abandoned')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<any>();
  if (!row) return { ok: true, challenge: null };
  return { ok: true, challenge: await hydrate(db, row) };
}

/** Commit to a 30-day challenge coming out of this run. */
export async function createChallenge(params: {
  sessionId: string;
  token?: string;
  behavior: string;
  cue?: string;
  focusKey?: string;
  focusLabel?: string;
}): Promise<{ ok: boolean; challenge?: Challenge; reason?: string }> {
  const behavior = params.behavior.trim();
  if (behavior.length < 4) return { ok: false, reason: 'behavior_too_short' };

  const db = createAdminClient();
  const participantId = await resolveParticipant(db, params.sessionId, params.token);
  if (!participantId) return { ok: false, reason: 'not_authorized' };

  // one active challenge per run — if they already committed, return it rather than duplicating
  const existing = await getSessionChallenge({ sessionId: params.sessionId, token: params.token });
  if (existing.challenge && existing.challenge.status === 'active') return { ok: true, challenge: existing.challenge };

  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', params.sessionId).maybeSingle<any>();
  const { data: part } = await db.from('participants').select('subject_id').eq('id', participantId).maybeSingle<any>();
  const { data: row, error } = await db
    .from('challenges')
    .insert({
      session_id: params.sessionId,
      scenario_id: session?.scenario_id ?? null,
      participant_id: participantId,
      subject_id: part?.subject_id ?? null, // attribute to the person (behavioral memory)
      focus_key: params.focusKey ?? null,
      focus_label: params.focusLabel ?? null,
      behavior,
      cue: params.cue?.trim() || null,
    })
    .select('*')
    .single<any>();
  if (error || !row) return { ok: false, reason: error?.message ?? 'insert_failed' };
  return { ok: true, challenge: await hydrate(db, row) };
}

/** Log a check-in against a challenge (practiced it, or a note on a miss). */
export async function logChallengeCheckin(params: {
  challengeId: string;
  sessionId: string;
  token?: string;
  did: boolean;
  note?: string;
}): Promise<{ ok: boolean; challenge?: Challenge; reason?: string }> {
  const db = createAdminClient();
  const participantId = await resolveParticipant(db, params.sessionId, params.token);
  if (!participantId) return { ok: false, reason: 'not_authorized' };

  // authorize: the challenge must belong to this caller's run
  const { data: ch } = await db.from('challenges').select('*').eq('id', params.challengeId).eq('participant_id', participantId).maybeSingle<any>();
  if (!ch) return { ok: false, reason: 'not_found' };

  const { error } = await db.from('challenge_checkins').insert({ challenge_id: params.challengeId, did: params.did, note: params.note?.trim() || null });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, challenge: await hydrate(db, ch) };
}

// ============================================================================================
// Subject-scoped reps — the profile's active-challenge loop. The session-scoped actions above
// drive the debrief's per-run panel; these drive /play/profile, where a rep committed from the
// coach (no session) lives across runs and the leader logs a daily check-in. Owned by the
// signed-in person (subject resolved by email), so a leader only ever touches their own reps.
// ============================================================================================

export interface LeaderChallenge {
  id: string;
  behavior: string;       // the rep text ("Each day, …")
  cue: string | null;
  focusLabel: string | null;
  targetMarker: string | null;  // A1–A6
  targetLabel: string | null;   // human label of the target marker
  obstacle: string | null;      // named-in-advance blocker
  outcome: string | null;       // kept | partial | not_kept (graded at day 30)
  targetDays: number;
  status: string;
  createdAt: string;
  dayNumber: number;      // 1-based calendar day of the rep, capped at target
  keptDays: number;       // days logged (any rating)
  ratedToday: boolean;
  streak: number;         // consecutive logged days ending today or yesterday
  avgRating: number | null;      // mean rating across logged days
  weekAvgs: (number | null)[];   // week 1..4 mean rating
  lastRatings: { day: number; rating: number | null }[]; // last three logged, oldest→newest
  weekTwoNudge: string | null;   // their own obstacle quoted back on a rolling-3-day dip < 5
  followUp: { day: number; rating: number; prompt: string } | null; // pending ≤3/≥8 follow-up
  checkins: ChallengeCheckin[];
}

/** A generated rep option (not yet committed). */
export interface RepOption { text: string; targetMarker: string; targetLabel: string; annotation: string; hardest: boolean }

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10); // UTC yyyy-mm-dd

async function hydrateLeader(db: ReturnType<typeof createAdminClient>, row: any): Promise<LeaderChallenge> {
  const { data: rows } = await db
    .from('challenge_checkins')
    .select('id, did, rating, day, note, created_at')
    .eq('challenge_id', row.id)
    .order('created_at', { ascending: true });
  const target = row.target_days ?? 30;
  // one logical check-in per day — collapse to the latest per day number (or per calendar day for legacy rows)
  const byDay = new Map<number, any>();
  for (const c of rows ?? []) {
    const d = c.day ?? dayNumber(c.created_at, target);
    byDay.set(d, { id: c.id, did: c.did, rating: c.rating ?? null, day: d, note: c.note ?? null, createdAt: c.created_at });
  }
  const checkins = [...byDay.values()].sort((a, b) => a.day - b.day);

  const today = dayNumber(row.created_at, target);
  const ratedToday = byDay.has(today);
  const rated = checkins.filter((c) => c.rating != null);
  const avgRating = rated.length ? Math.round((rated.reduce((s, c) => s + (c.rating as number), 0) / rated.length) * 10) / 10 : null;

  // week 1..4 averages
  const weekAvgs = [1, 2, 3, 4].map((w) => {
    const lo = (w - 1) * 7 + 1, hi = w * 7;
    const wk = rated.filter((c) => c.day >= lo && c.day <= hi);
    return wk.length ? Math.round((wk.reduce((s, c) => s + (c.rating as number), 0) / wk.length) * 10) / 10 : null;
  });

  // current streak of logged days ending today/yesterday
  let streak = 0;
  for (let d = today; d >= 1; d--) {
    if (byDay.has(d)) streak++;
    else if (d !== today) break;
  }

  // week-two nudge: a rolling 3-day average < 5 with an obstacle on file → quote it back (§5)
  let weekTwoNudge: string | null = null;
  if (row.obstacle && today >= 3) {
    const last3 = [today, today - 1, today - 2].map((d) => byDay.get(d)?.rating).filter((r) => r != null) as number[];
    if (last3.length >= 2 && last3.reduce((s, r) => s + r, 0) / last3.length < 5) {
      weekTwoNudge = row.obstacle;
    }
  }

  // pending follow-up: latest logged day with a ≤3 or ≥8 rating and no note yet (§5)
  let followUp: LeaderChallenge['followUp'] = null;
  const latest = checkins[checkins.length - 1];
  if (latest && latest.rating != null && !latest.note && (latest.rating <= 3 || latest.rating >= 8)) {
    followUp = { day: latest.day, rating: latest.rating, prompt: latest.rating <= 3 ? `A ${latest.rating}. What got in the way?` : `An ${latest.rating} — what made today different?` };
  }

  return {
    id: row.id,
    behavior: row.behavior,
    cue: row.cue ?? null,
    focusLabel: row.focus_label ?? null,
    targetMarker: row.target_marker ?? null,
    targetLabel: row.target_marker ? MARKER_LABEL[row.target_marker] ?? null : null,
    obstacle: row.obstacle ?? null,
    outcome: row.outcome ?? null,
    targetDays: target,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    dayNumber: today,
    keptDays: byDay.size,
    ratedToday,
    streak,
    avgRating,
    weekAvgs,
    lastRatings: checkins.slice(-3).map((c) => ({ day: c.day, rating: c.rating })),
    weekTwoNudge,
    followUp,
    checkins,
  };
}

async function mySubjectId(db: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return null;
  const { data: subject } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  return subject?.id ?? null;
}

/** The signed-in leader's live 30-day reps (active + recently completed), newest first. */
export async function getMyChallenges(): Promise<{ ok: boolean; challenges: LeaderChallenge[]; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, challenges: [], reason: 'no_profile' };
  const { data: rows } = await db
    .from('challenges')
    .select('*')
    .eq('subject_id', subjectId)
    .in('status', ['active', 'done'])
    .order('created_at', { ascending: false });
  const challenges = await Promise.all((rows ?? []).map((r: any) => hydrateLeader(db, r)));
  return { ok: true, challenges };
}

// ---- rep validation (Screen-14 §3) — a rep must be a doable-on-your-worst-day observable behaviour
const FEELING = /\b(feel|feeling|be more|be less|try to|remember to|stay|remain|mindset|confident|calm|patient|open|present|aware|intentional)\b/i;
function validRep(text: string): boolean {
  const t = (text || '').trim();
  if (!/^each day,/i.test(t)) return false;
  if (t.length < 18 || t.length > 200) return false;
  if ((t.match(/[.!?]/g)?.length ?? 0) > 1) return false; // one sentence
  if (FEELING.test(t.replace(/^each day,\s*/i, '').split(/\s+/).slice(0, 3).join(' '))) return false; // don't open on a feeling
  return true;
}

/** Generate exactly three rep options from the leader's gap, one of which targets the UNSOLVED
 *  half of the gap behaviour (Screen-14 §3). Nothing is persisted — the leader selects, names an
 *  obstacle, then commits. */
export async function generateReps(): Promise<{ ok: boolean; options?: RepOption[]; reason?: string }> {
  let key: string;
  try { key = anthropicApiKey(); } catch { return { ok: false, reason: 'no_api_key' }; }
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const [fp, ledger] = await Promise.all([buildFingerprint(subjectId), getLedger(subjectId)]);
  if (!fp || fp.runs < 1) return { ok: false, reason: 'no_runs' };

  const exercised = (fp.markers ?? []).filter((m) => m.n >= 1).sort((a, b) => a.avg - b.avg);
  const weakest = exercised[0];
  if (!weakest) return { ok: false, reason: 'no_markers' };
  const strongest = [...exercised].sort((a, b) => b.avg - a.avg)[0];
  const markerLines = exercised.map((m) => `${m.key} ${m.label}: ${m.avg}/100 (n=${m.n})`).join('\n');
  const findingLines = (ledger?.open ?? []).map((c, i) => `F${i + 1} [${c.id}] "${c.text}" (marker ${c.marker ?? '—'})`).join('\n') || '(no open findings yet)';

  const system =
    `You generate exactly THREE 30-day daily reps for a leader, from their behavioural record. A rep is one daily lead measure they control — a behaviour, never a feeling or an intention. ` +
    `THE RULE THAT MATTERS MOST: the rep must target the half of the behaviour they have NOT already solved. Their lowest marker is ${weakest.key} ${weakest.label} at ${weakest.avg}/100; their strongest is ${strongest.key} ${strongest.label} at ${strongest.avg}/100. A rep aimed at what they are already good at produces consistency without change — worse than no rep. At least one option MUST target ${weakest.key} (${weakest.label}) specifically, aimed at the unsolved half. ` +
    `Each option: text starts EXACTLY with "Each day," ; one sentence; imperative; doable on their worst day; observable (they can answer yes/no at 4pm); names a behaviour not a feeling. Give each a target_marker (one of A1..A6) and a one-line annotation saying what it targets and how hard it is. Mark exactly one as the hardest/most-specific. ` +
    `Ground everything in the RECORD; invent no numbers, names, or quotes. Output ONLY JSON: {"options":[{"text":"Each day, …","target_marker":"A?","annotation":"…","hardest":true|false}]} with exactly 3 options.`;
  const record = `MARKERS (low→high):\n${markerLines}\n\nOPEN FINDINGS:\n${findingLines}\n\nRUNS: ${fp.runs}. LOWEST/UNSOLVED: ${weakest.key} ${weakest.label}.`;

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({ model: VOICE_MODEL, max_tokens: 900, system, messages: [{ role: 'user', content: `${record}\n\nGenerate the three reps now. JSON only.` }] });
    const txt = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
    const m = txt.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    let options: RepOption[] = (parsed?.options ?? [])
      .filter((o: any) => o?.text && MARKER_LABEL[o.target_marker] && validRep(o.text))
      .map((o: any) => ({ text: o.text.trim(), targetMarker: o.target_marker, targetLabel: MARKER_LABEL[o.target_marker], annotation: String(o.annotation ?? '').trim(), hardest: !!o.hardest }));
    // must include at least one aimed at the unsolved (weakest) marker
    if (!options.some((o) => o.targetMarker === weakest.key)) return { ok: false, reason: 'no_unsolved_option' };
    options = options.slice(0, 3);
    if (options.length < 3) return { ok: false, reason: 'too_few' };
    return { ok: true, options };
  } catch {
    return { ok: false, reason: 'model_unreachable' };
  }
}

/** Commit a selected rep with its obstacle (Screen-14 §4). One active rep at a time. */
export async function commitRep(params: { text: string; targetMarker: string; sourceClaimId?: string; obstacle?: string }): Promise<{ ok: boolean; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const text = params.text.trim();
  if (!validRep(text) || !MARKER_LABEL[params.targetMarker]) return { ok: false, reason: 'invalid_rep' };
  // one active rep at a time
  const { data: active } = await db.from('challenges').select('id').eq('subject_id', subjectId).eq('status', 'active').limit(1).maybeSingle<any>();
  if (active) return { ok: false, reason: 'already_active' };
  const { error } = await db.from('challenges').insert({
    subject_id: subjectId,
    behavior: text,
    target_marker: params.targetMarker,
    source_claim_id: params.sourceClaimId ?? null,
    obstacle: params.obstacle?.trim() || null,
    focus_label: MARKER_LABEL[params.targetMarker],
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/** Log today's 1–10 rating (Screen-14 §5). One per rep-day; re-logging updates it. */
export async function checkinMyChallenge(params: { challengeId: string; rating: number; note?: string }): Promise<{ ok: boolean; challenge?: LeaderChallenge; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const { data: ch } = await db.from('challenges').select('*').eq('id', params.challengeId).eq('subject_id', subjectId).maybeSingle<any>();
  if (!ch) return { ok: false, reason: 'not_found' };
  const rating = Math.max(1, Math.min(10, Math.round(params.rating)));
  const target = ch.target_days ?? 30;
  const day = dayNumber(ch.created_at, target);

  const { data: existing } = await db.from('challenge_checkins').select('id, day, created_at').eq('challenge_id', ch.id);
  const todays = (existing ?? []).find((c: any) => (c.day ?? dayNumber(c.created_at, target)) === day);
  if (todays) {
    await db.from('challenge_checkins').update({ rating, did: rating >= 4, day, ...(params.note !== undefined ? { note: params.note?.trim() || null } : {}) }).eq('id', (todays as any).id);
  } else {
    const { error } = await db.from('challenge_checkins').insert({ challenge_id: ch.id, rating, did: rating >= 4, day, note: params.note?.trim() || null });
    if (error) return { ok: false, reason: error.message };
  }
  return { ok: true, challenge: await hydrateLeader(db, ch) };
}

/** Answer the one ≤3/≥8 follow-up (Screen-14 §5) — stores the note on the latest check-in. */
export async function answerFollowUp(params: { challengeId: string; day: number; note: string }): Promise<{ ok: boolean; challenge?: LeaderChallenge; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const { data: ch } = await db.from('challenges').select('*').eq('id', params.challengeId).eq('subject_id', subjectId).maybeSingle<any>();
  if (!ch) return { ok: false, reason: 'not_found' };
  const target = ch.target_days ?? 30;
  const { data: rows } = await db.from('challenge_checkins').select('id, day, created_at').eq('challenge_id', ch.id);
  const rowForDay = (rows ?? []).find((c: any) => (c.day ?? dayNumber(c.created_at, target)) === params.day);
  if (rowForDay) await db.from('challenge_checkins').update({ note: params.note.trim() || null }).eq('id', (rowForDay as any).id);
  return { ok: true, challenge: await hydrateLeader(db, ch) };
}

/** Grade a rep's outcome from days logged (Screen-14 §6): kept 21+, partial 10–20, else not_kept. */
function gradeOutcome(daysLogged: number, abandoned: boolean): 'kept' | 'partial' | 'not_kept' {
  if (abandoned) return 'not_kept';
  if (daysLogged >= 21) return 'kept';
  if (daysLogged >= 10) return 'partial';
  return 'not_kept';
}

/** Mark one of the leader's own reps complete or dropped; grades the outcome on completion. */
export async function setMyChallengeStatus(params: { challengeId: string; status: 'active' | 'done' | 'abandoned' }): Promise<{ ok: boolean; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const { data: ch } = await db.from('challenges').select('*').eq('id', params.challengeId).eq('subject_id', subjectId).maybeSingle<any>();
  if (!ch) return { ok: false, reason: 'not_found' };
  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === 'done' || params.status === 'abandoned') {
    const { count } = await db.from('challenge_checkins').select('id', { count: 'exact', head: true }).eq('challenge_id', ch.id);
    patch.outcome = gradeOutcome(count ?? 0, params.status === 'abandoned');
  }
  const { error } = await db.from('challenges').update(patch).eq('id', params.challengeId).eq('subject_id', subjectId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
