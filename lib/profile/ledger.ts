import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Read side of the claim ledger — what the participant sees on their profile: the current
// findings (open claims), the graded history (held/sharpened/overturned/withdrawn), each with
// its falsifier and what happened, and the latest run's narrative.

export interface LedgerClaim {
  id: string;
  label: string; // C1, C2, …
  text: string;
  falsifier: string;
  marker: string | null;
  status: string;
  madeAtRun: number;
  gradedAtRun: number | null;
  superseded: boolean;
}
export interface Ledger {
  claims: LedgerClaim[];
  open: LedgerClaim[]; // current live findings + what the next run tests
  graded: LedgerClaim[]; // history: held/sharpened/overturned/withdrawn
  narrative: string | null;
  transfer: { tell: string; watch_for: string } | null; // Monday workplace transfer (coaching hypothesis)
  profiledRun: number; // highest run a profile was generated for (0 if none)
}

export async function getLedger(subjectId: string): Promise<Ledger> {
  const db = createAdminClient();
  const { data: rows } = await db
    .from('profile_claims')
    .select('id, text, falsifier, marker, status, made_at_run, graded_at_run, superseded_by')
    .eq('subject_id', subjectId)
    .order('made_at_run', { ascending: true })
    .order('created_at', { ascending: true });
  const claims: LedgerClaim[] = (rows ?? []).map((c: any, i: number) => ({
    id: c.id,
    label: `C${i + 1}`,
    text: c.text,
    falsifier: c.falsifier,
    marker: c.marker ?? null,
    status: c.status,
    madeAtRun: c.made_at_run,
    gradedAtRun: c.graded_at_run ?? null,
    superseded: !!c.superseded_by,
  }));

  const { data: prof } = await db
    .from('leadership_profiles')
    .select('run_no, body_json')
    .eq('subject_id', subjectId)
    .order('run_no', { ascending: false })
    .limit(1)
    .maybeSingle<any>();

  return {
    claims,
    open: claims.filter((c) => c.status === 'open'),
    graded: claims.filter((c) => c.status !== 'open'),
    narrative: prof?.body_json?.narrative || null,
    transfer: prof?.body_json?.transfer?.tell ? prof.body_json.transfer : null,
    profiledRun: prof?.run_no ?? 0,
  };
}

export async function getLedgerForEmail(email: string): Promise<Ledger | null> {
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id').eq('handle', email.toLowerCase()).maybeSingle<any>();
  if (!subject) return null;
  return getLedger(subject.id);
}
