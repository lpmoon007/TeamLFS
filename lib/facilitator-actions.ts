'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { facilitatorSecret } from '@/lib/env';
import { isFacilitatorSession, setFacilitatorSession, clearFacilitatorSession } from '@/lib/facilitator-session';
import { fireInject } from '@/lib/inject';
import { finalizeSession } from '@/lib/finalize';
import { broadcast } from '@/lib/realtime-server';
import { seatChannel } from '@/lib/channels';

// Facilitator dashboard actions (Phase 8). All guarded by the facilitator cookie.

export async function facilitatorLogin(key: string): Promise<{ ok: boolean }> {
  let secret = '';
  try {
    secret = facilitatorSecret();
  } catch {
    return { ok: false };
  }
  if (!key || key !== secret) return { ok: false };
  await setFacilitatorSession();
  return { ok: true };
}

export async function facilitatorLogout(): Promise<void> {
  await clearFacilitatorSession();
}

async function guard() {
  if (!(await isFacilitatorSession())) throw new Error('unauthorized');
  return createAdminClient();
}

export interface SessionSummary {
  id: string;
  status: string;
  scenario: string;
  started_at: string | null;
  ended_at: string | null;
  participants: number;
  present: number;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const db = await guard();
  const { data: sessions } = await db
    .from('sessions')
    .select('id, status, started_at, ended_at, scenario:scenarios!inner(title)')
    .order('created_at', { ascending: false });
  const ids = (sessions ?? []).map((s: any) => s.id);
  const counts = new Map<string, { total: number; present: number }>();
  if (ids.length) {
    const { data: parts } = await db.from('participants').select('session_id, present').in('session_id', ids);
    for (const p of parts ?? []) {
      const c = counts.get((p as any).session_id) ?? { total: 0, present: 0 };
      c.total++;
      if ((p as any).present) c.present++;
      counts.set((p as any).session_id, c);
    }
  }
  return (sessions ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    scenario: s.scenario?.title ?? '—',
    started_at: s.started_at,
    ended_at: s.ended_at,
    participants: counts.get(s.id)?.total ?? 0,
    present: counts.get(s.id)?.present ?? 0,
  }));
}

export interface RosterRow {
  participantId: string;
  seatKey: string;
  name: string;
  role: string | null;
  present: boolean;
  callableContacts: { key: string; full: string }[];
}

export async function loadControl(sessionId: string): Promise<{
  session: { id: string; status: string; scenario: string; scenarioId: string } | null;
  roster: RosterRow[];
}> {
  const db = await guard();
  const { data: session } = await db
    .from('sessions')
    .select('id, status, scenario_id, scenario:scenarios!inner(title)')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return { session: null, roster: [] };

  const { data: parts } = await db
    .from('participants')
    .select('id, present, seat:seats!inner(id, key, name, role)')
    .eq('session_id', sessionId);

  const { data: contacts } = await db
    .from('contacts')
    .select('key, full, seat_id, callable')
    .eq('scenario_id', session.scenario_id)
    .eq('callable', true);

  const roster: RosterRow[] = (parts ?? []).map((p: any) => ({
    participantId: p.id,
    seatKey: p.seat?.key,
    name: p.seat?.name ?? p.seat?.key,
    role: p.seat?.role ?? null,
    present: p.present,
    callableContacts: (contacts ?? [])
      .filter((c: any) => c.seat_id === p.seat?.id || c.seat_id === null)
      .map((c: any) => ({ key: c.key, full: c.full })),
  }));

  return {
    session: { id: session.id, status: session.status, scenario: session.scenario?.title ?? '—', scenarioId: session.scenario_id },
    roster,
  };
}

export interface InjectRow {
  id: string;
  seat: string | null;
  kind: string;
  thread: string | null;
  delay_min: number | null;
  cond: string | null;
  trigger: number | null;
  preview: string;
}

export async function listInjects(sessionId: string): Promise<InjectRow[]> {
  const db = await guard();
  const { data: session } = await db.from('sessions').select('scenario_id').eq('id', sessionId).maybeSingle<any>();
  if (!session) return [];
  const { data: injects } = await db
    .from('injects')
    .select('id, seat_id, kind, payload_json, order_idx')
    .eq('scenario_id', session.scenario_id)
    .order('order_idx', { ascending: true });
  const { data: seats } = await db.from('seats').select('id, key').eq('scenario_id', session.scenario_id);
  const seatKey = new Map((seats ?? []).map((s: any) => [s.id, s.key]));
  return (injects ?? []).map((i: any) => ({
    id: i.id,
    seat: i.seat_id ? seatKey.get(i.seat_id) ?? null : null,
    kind: i.kind,
    thread: i.payload_json?.thread ?? i.payload_json?.contact_key ?? null,
    delay_min: i.payload_json?.delay_min ?? null,
    cond: i.payload_json?.cond ?? null,
    trigger: i.payload_json?.propagation_trigger ?? null,
    preview: String(i.payload_json?.body ?? i.payload_json?.text ?? '').slice(0, 140),
  }));
}

export async function fireInjectFac(sessionId: string, injectId: string, force: boolean): Promise<any> {
  await guard();
  return fireInject(sessionId, injectId, { force });
}

export async function finalizeFac(sessionId: string): Promise<any> {
  await guard();
  return finalizeSession(sessionId);
}

export interface FeedEvent {
  id: string;
  seat: string | null;
  type: string;
  channel: string | null;
  target: string | null;
  at: string;
  derived: boolean;
  preview: string | null;
}

export async function recentEvents(sessionId: string, limit = 60): Promise<FeedEvent[]> {
  const db = await guard();
  const { data } = await db
    .from('events')
    .select('id, type, channel, target, ts, derived, payload_json, seat:seats(key)')
    .eq('session_id', sessionId)
    .order('ts', { ascending: false })
    .limit(limit);
  return (data ?? []).map((e: any) => ({
    id: e.id,
    seat: e.seat?.key ?? null,
    type: e.type,
    channel: e.channel,
    target: e.target,
    at: e.ts,
    derived: e.derived,
    preview: previewOf(e.payload_json),
  }));
}

/** Hand-drive an NPC: deliver a message as `contactKey` to `seatKey`'s thread. */
export async function sendAsNpc(params: {
  sessionId: string;
  seatKey: string;
  contactKey: string;
  body: string;
}): Promise<{ ok: boolean }> {
  const db = await guard();
  const body = params.body.trim();
  if (!body) return { ok: false };

  const { data: session } = await db.from('sessions').select('scenario_id, status').eq('id', params.sessionId).maybeSingle<any>();
  if (!session || session.status !== 'live') return { ok: false };

  const { data: seat } = await db
    .from('seats')
    .select('id')
    .eq('scenario_id', session.scenario_id)
    .eq('key', params.seatKey)
    .maybeSingle<{ id: string }>();
  if (!seat) return { ok: false };

  const { data: participant } = await db
    .from('participants')
    .select('id')
    .eq('session_id', params.sessionId)
    .eq('seat_id', seat.id)
    .maybeSingle<{ id: string }>();

  const { data: contact } = await db
    .from('contacts')
    .select('callable')
    .eq('scenario_id', session.scenario_id)
    .eq('key', params.contactKey)
    .limit(1)
    .maybeSingle<{ callable: boolean }>();
  const sender = contact?.callable ? 'npc' : 'system';

  const { data: thread } = await db
    .from('threads')
    .upsert(
      { session_id: params.sessionId, seat_id: seat.id, contact_key: params.contactKey, is_group: false },
      { onConflict: 'session_id,seat_id,contact_key' },
    )
    .select('id')
    .single<{ id: string }>();
  if (!thread) return { ok: false };

  const { data: msg } = await db
    .from('messages')
    .insert({ thread_id: thread.id, sender, body })
    .select('id, sent_at')
    .single<any>();

  await broadcast(seatChannel(params.sessionId, params.seatKey), 'message', {
    id: msg?.id,
    thread_id: thread.id,
    contact_key: params.contactKey,
    sender,
    body,
    sent_at: msg?.sent_at,
  });

  // Capture as a delivered stimulus (hand-driven), so behavior stays attributable.
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: participant?.id ?? null,
    seat_id: seat.id,
    type: 'inject_delivered',
    channel: 'message',
    target: params.contactKey,
    payload_json: { hand_driven: true, preview: body.slice(0, 140) },
  });

  return { ok: true };
}

function previewOf(payload: any): string | null {
  const b = payload?.body ?? payload?.text ?? payload?.preview ?? payload?.edited_text ?? null;
  return b ? String(b).slice(0, 100) : null;
}
