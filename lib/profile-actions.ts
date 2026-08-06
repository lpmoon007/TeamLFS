'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentFacilitator } from '@/lib/auth';
import { isAdmin } from '@/lib/facilitator-session';
import { generateProfile } from '@/lib/profile/generate';

// Server action: generate (or refresh) the signed-in leader's own Leadership Profile — the
// self-revision pipeline for their latest completed run. Runs the adversarial audit +
// generation + grounding, then persists the claim ledger. Resolves the subject by email so a
// facilitator/admin who plays is profiled too.
export async function generateMyProfile(): Promise<{ ok: boolean; reason?: string; runNo?: number }> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return { ok: false, reason: 'not_signed_in' };
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  if (!subject) return { ok: false, reason: 'no_profile' };
  return generateProfile(subject.id);
}

/** Admin/coach: generate (or re-grade) the profile for a specific person (subject). */
export async function generateForSubject(subjectId: string): Promise<{ ok: boolean; reason?: string; runNo?: number; diag?: Record<string, any> }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden' };
  return generateProfile(subjectId);
}

/** Contest one of your own findings (Screen-14 §3). Persists the challenge so the next run tests
 *  it first and the coach argues the evidence rather than restating the claim. Toggle off with a
 *  null note. Only the leader can contest their own claim. */
export async function contestFinding(params: { claimId: string; note?: string | null }): Promise<{ ok: boolean; reason?: string }> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return { ok: false, reason: 'not_signed_in' };
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  if (!subject) return { ok: false, reason: 'no_profile' };
  // ownership: the claim must belong to this leader's subject
  const { data: claim } = await db.from('profile_claims').select('id').eq('id', params.claimId).eq('subject_id', subject.id).maybeSingle<any>();
  if (!claim) return { ok: false, reason: 'not_found' };
  const clearing = params.note === null;
  const { error } = await db.from('profile_claims').update({
    contested_at: clearing ? null : new Date().toISOString(),
    contest_note: clearing ? null : (params.note?.trim() || null),
  }).eq('id', params.claimId).eq('subject_id', subject.id);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
