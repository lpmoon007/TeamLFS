import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Consistency comes BACK from challenge.belegendary.org here (spec §3, option 1). The challenge
// owns delivery + rating; on completion it posts { ref, days_logged, week1_avg, week4_avg } and
// we record it against the leader's most recent rep — the only thing we need back, and only so
// the next profile can pair consistency with marker movement (the promise ledger).
//
// Auth: a shared secret in the Authorization header. Without CHALLENGE_WEBHOOK_SECRET set, the
// endpoint refuses every call rather than trusting anonymous input.
export async function POST(req: Request) {
  const secret = process.env.CHALLENGE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }); }
  const ref = String(body?.ref ?? '').trim();
  if (!ref) return NextResponse.json({ ok: false, error: 'missing_ref' }, { status: 400 });

  const days = Math.max(0, Math.min(30, Math.round(Number(body?.days_logged ?? 0))));
  const outcome = days >= 21 ? 'kept' : days >= 10 ? 'partial' : 'not_kept';
  const week1 = body?.week1_avg != null ? Number(body.week1_avg) : null;
  const week4 = body?.week4_avg != null ? Number(body.week4_avg) : null;

  const db = createAdminClient();
  // ref is the subject id we handed off — update that subject's most recent commitment
  const { data: latest } = await db.from('rep_commitments').select('id').eq('subject_id', ref).order('committed_at', { ascending: false }).limit(1).maybeSingle<any>();
  if (!latest) return NextResponse.json({ ok: false, error: 'no_rep' }, { status: 404 });

  const { error } = await db.from('rep_commitments').update({
    days_logged: days, week1_avg: week1, week4_avg: week4, outcome,
    status: 'complete', reported_via: 'webhook', updated_at: new Date().toISOString(),
  }).eq('id', latest.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
