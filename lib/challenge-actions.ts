'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFacilitatorSession } from '@/lib/facilitator-session';

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
  const { data: row, error } = await db
    .from('challenges')
    .insert({
      session_id: params.sessionId,
      scenario_id: session?.scenario_id ?? null,
      participant_id: participantId,
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
