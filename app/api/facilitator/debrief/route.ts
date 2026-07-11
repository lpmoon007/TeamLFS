import { NextResponse } from 'next/server';
import { isFacilitator } from '@/lib/facilitator-auth';
import { buildDebrief } from '@/lib/debrief';

// GET /api/facilitator/debrief?sessionId=...
//   Authorization: Bearer <FACILITATOR_SECRET>
// JSON debrief for a session (timeline + first-move + latencies + trait scores).
// Programmatic exports can consume this; the human-readable view is /facilitator/debrief.
export async function GET(req: Request) {
  if (!isFacilitator(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  const debrief = await buildDebrief(sessionId);
  if (!debrief) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  return NextResponse.json(debrief);
}
