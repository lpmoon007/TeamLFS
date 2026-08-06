import { NextResponse } from 'next/server';
import { isChallengeWebhook } from '@/lib/facilitator-auth';
import { challengeWebhookSecret } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/challenge/webhook — completion callback from Be Legendary's
// "Your 30-Day Challenge" app (challenge.belegendary.org).
//
// When a participant we deep-linked from a solo debrief finishes their 30 days,
// the challenge app POSTs their results here, keyed on the opaque `ref` we passed
// in (the solo session id). We verify the shared secret (X-Webhook-Secret) and
// upsert the summary into `challenge_completions` (see migration 0013).
//
// Body: { ref: string, days_logged: number, week1_avg: number|null, week4_avg: number|null }
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Coerce a possibly-string/number/null field to a finite number or null.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  // Not configured yet → reject clearly rather than trust every caller.
  if (!challengeWebhookSecret()) {
    return NextResponse.json(
      { error: 'challenge webhook not configured' },
      { status: 503 },
    );
  }
  if (!isChallengeWebhook(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const ref = typeof body?.ref === 'string' ? body.ref.trim() : '';
  if (!ref) {
    return NextResponse.json({ error: 'missing ref' }, { status: 400 });
  }

  const daysLogged = num(body?.days_logged);
  const row = {
    ref,
    session_id: UUID_RE.test(ref) ? ref : null,
    days_logged: daysLogged === null ? null : Math.round(daysLogged),
    week1_avg: num(body?.week1_avg),
    week4_avg: num(body?.week4_avg),
    payload: body,
    received_at: new Date().toISOString(),
  };

  const db = createAdminClient();
  // Idempotent: a re-delivered callback for the same ref overwrites in place.
  const { error } = await db
    .from('challenge_completions')
    .upsert(row, { onConflict: 'ref' });

  if (error) {
    console.error('challenge_completions upsert failed:', error);
    return NextResponse.json({ error: 'storage failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
