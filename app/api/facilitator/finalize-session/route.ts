import { NextResponse } from 'next/server';
import { isFacilitator } from '@/lib/facilitator-auth';
import { finalizeSession } from '@/lib/finalize';

// POST /api/facilitator/finalize-session
//   Authorization: Bearer <FACILITATOR_SECRET>
//   { "sessionId": "..." }
//
// Ends the session, sweeps the high-signal omission events into the capture log,
// and persists a trait-score snapshot (Phase 7 hardening). Idempotent.
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
  const result = await finalizeSession(body.sessionId);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
