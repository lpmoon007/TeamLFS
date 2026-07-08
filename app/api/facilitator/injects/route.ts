import { NextResponse } from 'next/server';
import { isFacilitator } from '@/lib/facilitator-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/facilitator/injects?sessionId=...
//   Authorization: Bearer <FACILITATOR_SECRET>
//
// Lists the authored beats for a session's scenario (id, seat, kind, order, timing,
// condition, preview) so a human or make.com can pick what to fire. Read-only.
export async function GET(req: Request) {
  if (!isFacilitator(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });

  const { data: injects } = await db
    .from('injects')
    .select('id, seat_id, kind, payload_json, order_idx')
    .eq('scenario_id', session.scenario_id)
    .order('order_idx', { ascending: true });

  const { data: seats } = await db.from('seats').select('id, key').eq('scenario_id', session.scenario_id);
  const seatKeyById = new Map((seats ?? []).map((s: any) => [s.id, s.key]));

  const list = (injects ?? []).map((i: any) => ({
    id: i.id,
    seat: i.seat_id ? seatKeyById.get(i.seat_id) ?? null : null,
    kind: i.kind,
    order_idx: i.order_idx,
    thread: i.payload_json?.thread ?? i.payload_json?.contact_key ?? null,
    delay_min: i.payload_json?.delay_min ?? null,
    cond: i.payload_json?.cond ?? null,
    propagation_trigger: i.payload_json?.propagation_trigger ?? null,
    preview: String(i.payload_json?.body ?? i.payload_json?.text ?? '').slice(0, 120),
  }));

  return NextResponse.json({ sessionId, count: list.length, injects: list });
}
