import { NextResponse } from 'next/server';
import { isFacilitator } from '@/lib/facilitator-auth';
import { rescoreSession } from '@/lib/rescore';

// POST /api/facilitator/rescore
//   Authorization: Bearer <FACILITATOR_SECRET>
//   { "sessionId": "...", "persist": false }
//
// The re-score harness (Behavioral Memory Spine §3/§9). Re-reads a session's LOCKED
// Layer-1 log, runs the AI coder and the deterministic heuristic, and reports where
// they agree/disagree per trait — the inter-rater reliability seed. Dry-run by default;
// `persist: true` writes the fresh AI snapshot (versioned; safe to re-run).
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

  const result = await rescoreSession(body.sessionId, { persist: Boolean(body.persist) });
  const status = result.ok ? 200 : result.reason === 'not_found' ? 404 : 400;
  return NextResponse.json(result, { status });
}
