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
