'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentFacilitator } from '@/lib/auth';
import { repOptionsFor } from '@/lib/rep-options';

// Server actions for the 30-day rep. TeamLFS owns the prescription only — it stores the
// commitment and returns the ref the client needs to hand off to challenge.belegendary.org.
// No SMS, no rating capture, no streak logic lives here (spec §4).

async function mySubjectId(): Promise<string | null> {
  const me = await currentFacilitator();
  if (!me || me.isMaster || !/@/.test(me.email)) return null;
  const db = createAdminClient();
  const { data } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
  return data?.id ?? null;
}

/** Commit a rep. Stores rep_text + target_marker + source_claim_id + obstacle, then returns the
 *  ref (subject id) so the client can hand off to the challenge with the rep prefilled. The rep
 *  text is validated against the generated set for its marker — the leader can only commit a rep
 *  we actually derived from their record, never an arbitrary string. */
export async function commitRep(params: {
  optionId: string;
  targetMarker: string;
  sourceClaimId?: string | null;
  obstacle?: string | null;
}): Promise<{ ok: boolean; reason?: string; ref?: string; repText?: string }> {
  const subjectId = await mySubjectId();
  if (!subjectId) return { ok: false, reason: 'not_signed_in' };

  // the rep must be one we generated for this marker — trust the option id, not free text
  const option = repOptionsFor(params.targetMarker).find((o) => o.id === params.optionId);
  if (!option) return { ok: false, reason: 'invalid_option' };

  const db = createAdminClient();
  // if a source claim was named, it must belong to this leader (else store null)
  let sourceClaimId: string | null = null;
  if (params.sourceClaimId) {
    const { data: claim } = await db.from('profile_claims').select('id').eq('id', params.sourceClaimId).eq('subject_id', subjectId).maybeSingle<any>();
    sourceClaimId = claim?.id ?? null;
  }

  const { error } = await db.from('rep_commitments').insert({
    subject_id: subjectId,
    rep_text: option.text,
    target_marker: option.marker,
    source_claim_id: sourceClaimId,
    obstacle: params.obstacle?.trim() || null,
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, ref: subjectId, repText: option.text };
}

/** Self-report fallback (spec §3, option 3): at a later visit the leader can record how many of
 *  30 days they kept. Tagged reported_via='self_report' so the promise ledger never cites it as
 *  observed behaviour (two-sources rule). Only updates the most recent commitment. */
export async function selfReportRep(params: { daysLogged: number }): Promise<{ ok: boolean; reason?: string }> {
  const subjectId = await mySubjectId();
  if (!subjectId) return { ok: false, reason: 'not_signed_in' };
  const days = Math.max(0, Math.min(30, Math.round(params.daysLogged)));
  const outcome = days >= 21 ? 'kept' : days >= 10 ? 'partial' : 'not_kept';
  const db = createAdminClient();
  const { data: latest } = await db.from('rep_commitments').select('id').eq('subject_id', subjectId).order('committed_at', { ascending: false }).limit(1).maybeSingle<any>();
  if (!latest) return { ok: false, reason: 'no_rep' };
  const { error } = await db.from('rep_commitments').update({
    days_logged: days, outcome, status: 'complete', reported_via: 'self_report', updated_at: new Date().toISOString(),
  }).eq('id', latest.id);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
