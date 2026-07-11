import { NextResponse } from 'next/server';
import { isFacilitator } from '@/lib/facilitator-auth';
import { fireInject } from '@/lib/inject';

// POST /api/facilitator/fire-inject
//   Authorization: Bearer <FACILITATOR_SECRET>
//   { "sessionId": "...", "injectId": "...", "force": false }
//
// Fires an authored beat into a live session (handoff §5). Manual trigger from the
// console; the unattended cadence runs through the Director (Vercel Cron). `force`
// bypasses the best-effort cancelIf check.
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
  const { sessionId, injectId, force } = body ?? {};
  if (!sessionId || !injectId) {
    return NextResponse.json({ error: 'sessionId and injectId are required' }, { status: 400 });
  }

  const result = await fireInject(sessionId, injectId, { force: Boolean(force), firedBy: null });
  const status = result.ok ? 200 : result.reason === 'not_found' ? 404 : 409;
  return NextResponse.json(result, { status });
}
