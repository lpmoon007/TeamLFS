'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFacilitatorSession } from '@/lib/facilitator-session';
import { currentFacilitator } from '@/lib/auth';

// The 30-day behavioral challenge — the bridge from the debrief's insight to real change.
// After a run, the leader commits to one habit (drawn from their weakest read) and can log
// check-ins as they practice it. Owned by the participant who ran the crisis, resolved from
// the solo token (participant) or the facilitator cookie (the human seat). Same admin-client
// pattern as the rest of the solo actions — the service role is the only reader/writer.

export interface ChallengeCheckin {
  id: string;
  did: boolean;
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
    .select('id, did, note, created_at')
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
    checkins: (checkins ?? []).map((c: any) => ({ id: c.id, did: c.did, note: c.note ?? null, createdAt: c.created_at })),
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
  behavior: string;
  cue: string | null;
  focusLabel: string | null;
  targetDays: number;
  status: string;
  createdAt: string;
  dayNumber: number;      // 1-based calendar day of the rep, capped at target
  keptDays: number;       // distinct days practiced (did=true)
  checkedInToday: boolean;
  streak: number;         // consecutive practiced days ending today or yesterday
  checkins: ChallengeCheckin[];
}

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10); // UTC yyyy-mm-dd

async function hydrateLeader(db: ReturnType<typeof createAdminClient>, row: any): Promise<LeaderChallenge> {
  const { data: rows } = await db
    .from('challenge_checkins')
    .select('id, did, note, created_at')
    .eq('challenge_id', row.id)
    .order('created_at', { ascending: true });
  const checkins = (rows ?? []).map((c: any) => ({ id: c.id, did: c.did, note: c.note ?? null, createdAt: c.created_at }));

  const practiced = new Set<string>();
  for (const c of checkins) if (c.did) practiced.add(dayKey(new Date(c.createdAt).getTime()));
  const today = dayKey(Date.now());
  const checkedInToday = checkins.some((c) => dayKey(new Date(c.createdAt).getTime()) === today);

  // current streak: walk back from today over consecutive practiced days (yesterday still counts)
  let streak = 0;
  for (let d = new Date(); ; d.setUTCDate(d.getUTCDate() - 1)) {
    const k = dayKey(d.getTime());
    if (practiced.has(k)) streak++;
    else if (k !== today) break; // an un-practiced past day ends the streak; today-not-yet is fine
  }

  return {
    id: row.id,
    behavior: row.behavior,
    cue: row.cue ?? null,
    focusLabel: row.focus_label ?? null,
    targetDays: row.target_days ?? 30,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    dayNumber: dayNumber(row.created_at, row.target_days ?? 30),
    keptDays: practiced.size,
    checkedInToday,
    streak,
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

/** Log today's check-in on one of the leader's own reps (one per calendar day). */
export async function checkinMyChallenge(params: { challengeId: string; did: boolean; note?: string }): Promise<{ ok: boolean; challenge?: LeaderChallenge; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const { data: ch } = await db.from('challenges').select('*').eq('id', params.challengeId).eq('subject_id', subjectId).maybeSingle<any>();
  if (!ch) return { ok: false, reason: 'not_found' };

  // one check-in per calendar day — re-logging today updates the existing row rather than stacking
  const today = dayKey(Date.now());
  const { data: existing } = await db.from('challenge_checkins').select('id, created_at').eq('challenge_id', ch.id).order('created_at', { ascending: false }).limit(30);
  const todays = (existing ?? []).find((c: any) => dayKey(new Date(c.created_at).getTime()) === today);
  if (todays) {
    await db.from('challenge_checkins').update({ did: params.did, note: params.note?.trim() || null }).eq('id', (todays as any).id);
  } else {
    const { error } = await db.from('challenge_checkins').insert({ challenge_id: ch.id, did: params.did, note: params.note?.trim() || null });
    if (error) return { ok: false, reason: error.message };
  }
  return { ok: true, challenge: await hydrateLeader(db, ch) };
}

/** Mark one of the leader's own reps done or dropped. */
export async function setMyChallengeStatus(params: { challengeId: string; status: 'active' | 'done' | 'abandoned' }): Promise<{ ok: boolean; reason?: string }> {
  const db = createAdminClient();
  const subjectId = await mySubjectId(db);
  if (!subjectId) return { ok: false, reason: 'no_profile' };
  const { error } = await db.from('challenges').update({ status: params.status }).eq('id', params.challengeId).eq('subject_id', subjectId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
