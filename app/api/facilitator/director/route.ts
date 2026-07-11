import { NextResponse } from 'next/server';
import { isFacilitator } from '@/lib/facilitator-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runDirector } from '@/lib/director';

// POST /api/facilitator/director
//   Authorization: Bearer <FACILITATOR_SECRET>
//   { "sessionId": "...", "dryRun": false }
//
// One Director tick (Roadmap Horizon 1): evaluate the authored beats against the live
// session state and release the ones whose moment has come. This is the manual/console
// entry (Preview + Run tick); the unattended schedule runs through Vercel Cron at
// /api/cron/director. It's a no-op when the session's Director is disabled (manual
// firing then stands). `dryRun` previews without firing. `useAI` follows
// run_config.director.ai unless overridden in the body.
export async function POST(req: Request) {
  if (!isFacilitator(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body?.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: session } = await db.from('sessions').select('run_config').eq('id', body.sessionId).maybeSingle<any>();
  const cfg = session?.run_config?.director ?? {};
  // The scheduled tick only fires when the Director is enabled; a facilitator's explicit
  // dryRun/force call may still preview/run regardless.
  if (!body.force && !body.dryRun && cfg.enabled === false) {
    return NextResponse.json({ ok: true, skipped: 'director_disabled' }, { status: 200 });
  }
  const useAI = body.useAI ?? cfg.ai ?? false;

  const result = await runDirector(body.sessionId, { dryRun: Boolean(body.dryRun), useAI: Boolean(useAI) });
  const status = result.ok ? 200 : result.reason === 'not_found' ? 404 : 409;
  return NextResponse.json(result, { status });
}
