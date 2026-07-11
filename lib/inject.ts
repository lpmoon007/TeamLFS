import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcast } from '@/lib/realtime-server';
import { seatChannel } from '@/lib/channels';

// Phase 5 — the inject engine. Turns an authored beat (`injects` row) into live
// runtime state (handoff §5): materialize the message/email/situation/call/group,
// broadcast it, record what actually fired (`inject_fires`), and log the paired
// `inject_delivered` event so every downstream behavior can be tied to its stimulus
// (Behavioral Memory Spine §4 — the circularity guardrail).
//
// Triggered manually from the facilitator console, or automatically by the Director
// (Vercel Cron → /api/cron/director) on a schedule/condition. No external scheduler.

type Db = ReturnType<typeof createAdminClient>;

export interface FireResult {
  ok: boolean;
  fired: boolean;
  reason?: 'not_found' | 'session_not_live' | 'cancelled' | 'no_recipients';
  kind?: string;
  delivered?: number; // number of recipients delivered to
  cond?: string | null;
}

export async function fireInject(
  sessionId: string,
  injectId: string,
  opts: { firedBy?: string | null; force?: boolean } = {},
): Promise<FireResult> {
  const db = createAdminClient();

  const { data: inject } = await db
    .from('injects')
    .select('id, scenario_id, seat_id, kind, payload_json')
    .eq('id', injectId)
    .maybeSingle<any>();
  if (!inject) return { ok: false, fired: false, reason: 'not_found' };

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, status')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session || session.status !== 'live') return { ok: false, fired: false, reason: 'session_not_live' };

  const payload = inject.payload_json ?? {};
  const cond: string | null = payload.cond ?? null;

  // Recipients: a seat-scoped inject targets that seat's participant; a null-seat
  // inject (e.g. an all-hands situation) targets every participant in the session.
  const recipients = await resolveRecipients(db, sessionId, inject.seat_id);
  if (recipients.length === 0) return { ok: true, fired: false, reason: 'no_recipients', cond };

  // cancelIf (best-effort): "reply defuses the next nag". If the condition is a
  // no-response nag and the recipient HAS replied on the target thread, skip.
  if (cond && !opts.force && (await isDefused(db, sessionId, recipients, payload))) {
    return { ok: true, fired: false, reason: 'cancelled', kind: inject.kind, cond };
  }

  // Record the fire once.
  await db.from('inject_fires').insert({
    session_id: sessionId,
    inject_id: inject.id,
    fired_by: opts.firedBy ?? null,
  });

  let delivered = 0;
  for (const r of recipients) {
    await materialize(db, session.scenario_id, sessionId, inject, payload, r);
    // A1.2 — per-seat inject resolution (delivered now; reconciled at finalize).
    await db.from('inject_resolution').upsert(
      {
        session_id: sessionId,
        inject_id: inject.id,
        seat_id: r.seatId,
        contact_key: payload.thread ?? payload.contact_key ?? null,
        state: 'delivered',
      },
      { onConflict: 'session_id,inject_id,seat_id' },
    );
    // Paired stimulus event (Layer 1) — this is what makes behavior attributable.
    await db.from('events').insert({
      session_id: sessionId,
      participant_id: r.participantId,
      seat_id: r.seatId,
      type: 'inject_delivered',
      channel: channelForKind(inject.kind),
      target: payload.thread ?? payload.contact_key ?? null,
      payload_json: { inject_id: inject.id, kind: inject.kind, ...summarize(payload) },
    });
    delivered++;
  }

  return { ok: true, fired: true, kind: inject.kind, delivered, cond };
}

interface Recipient {
  participantId: string;
  seatId: string;
  seatKey: string;
}

async function resolveRecipients(db: Db, sessionId: string, seatId: string | null): Promise<Recipient[]> {
  let q = db.from('participants').select('id, seat_id, seat:seats!inner(key)').eq('session_id', sessionId);
  if (seatId) q = q.eq('seat_id', seatId);
  const { data } = await q;
  return (data ?? []).map((p: any) => ({ participantId: p.id, seatId: p.seat_id, seatKey: p.seat?.key }));
}

function channelForKind(kind: string): string {
  switch (kind) {
    case 'email':
      return 'email';
    case 'call':
      return 'call';
    case 'situation':
      return 'system';
    case 'group':
      return 'group';
    default:
      return 'message';
  }
}

function summarize(payload: any) {
  const body = payload.body ?? payload.text ?? '';
  return { preview: String(body).slice(0, 140), propagation_trigger: payload.propagation_trigger ?? null };
}

// Materialize the beat into runtime state + broadcast it to the recipient's seat.
async function materialize(db: Db, scenarioId: string, sessionId: string, inject: any, payload: any, r: Recipient) {
  const topic = seatChannel(sessionId, r.seatKey);

  if (inject.kind === 'message' || inject.kind === 'group') {
    const contactKey: string = payload.thread ?? payload.contact_key ?? 'group';
    const sender = await senderFor(db, scenarioId, contactKey, payload.from);
    const { data: thread } = await db
      .from('threads')
      .upsert(
        { session_id: sessionId, seat_id: r.seatId, contact_key: contactKey, is_group: inject.kind === 'group' },
        { onConflict: 'session_id,seat_id,contact_key' },
      )
      .select('id')
      .single<any>();
    const { data: msg } = await db
      .from('messages')
      .insert({ thread_id: thread.id, sender, body: String(payload.body ?? '') })
      .select('id, sent_at')
      .single<any>();
    await broadcast(topic, 'message', {
      id: msg?.id,
      thread_id: thread.id,
      contact_key: contactKey,
      sender,
      body: String(payload.body ?? ''),
      sent_at: msg?.sent_at,
    });
    return;
  }

  if (inject.kind === 'email') {
    const contactKey: string = payload.thread ?? payload.contact_key ?? 'system';
    const subject: string = payload.subject ?? deriveSubject(payload.body);
    const { data: email } = await db
      .from('emails')
      .insert({
        session_id: sessionId,
        seat_id: r.seatId,
        contact_key: contactKey,
        subject,
        body_json: { text: String(payload.body ?? '') },
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .select('id, contact_key, subject, body_json, document_id, status, delivered_at, read_at, created_at, decision, decision_json, decided_at')
      .single<any>();
    await broadcast(topic, 'email', email);
    return;
  }

  if (inject.kind === 'call') {
    const contactKey: string = payload.thread ?? payload.contact_key;
    const { data: call } = await db
      .from('calls')
      .insert({ session_id: sessionId, seat_id: r.seatId, contact_key: contactKey, direction: 'in' })
      .select('id')
      .single<any>();
    await broadcast(topic, 'call', { id: call?.id, contact_key: contactKey, direction: 'in' });
    return;
  }

  if (inject.kind === 'situation') {
    await broadcast(topic, 'situation', { text: String(payload.text ?? payload.body ?? ''), document: payload.document ?? null });
    return;
  }
}

// Message sender: an NPC contact → 'npc'; a text-only desk/automated feed → 'system';
// otherwise a teammate/coordination beat → the sender's seat key.
async function senderFor(db: Db, scenarioId: string, contactKey: string, from?: string): Promise<string> {
  const { data: contact } = await db
    .from('contacts')
    .select('callable')
    .eq('scenario_id', scenarioId)
    .eq('key', contactKey)
    .limit(1)
    .maybeSingle<any>();
  if (contact) return contact.callable ? 'npc' : 'system';
  return from ?? contactKey;
}

function deriveSubject(body?: string): string {
  const s = String(body ?? '').trim();
  if (!s) return '(no subject)';
  const firstLine = s.split(/[.\n]/)[0]!.trim();
  return firstLine.length > 72 ? firstLine.slice(0, 69) + '…' : firstLine;
}

// Was a no-response nag defused by the recipient replying on the target thread?
async function isDefused(db: Db, sessionId: string, recipients: Recipient[], payload: any): Promise<boolean> {
  const cond = String(payload.cond ?? '').toLowerCase();
  const isNoResponseNag = /(not responded|no response|hasn't|has not|still)/.test(cond);
  const thread: string | undefined = payload.thread ?? payload.contact_key;
  if (!isNoResponseNag || !thread) return false;
  // For a single-seat nag: did that participant send a message on this thread?
  const r = recipients[0]!;
  const { data } = await db
    .from('events')
    .select('id')
    .eq('session_id', sessionId)
    .eq('participant_id', r.participantId)
    .eq('type', 'message_sent')
    .eq('target', thread)
    .limit(1);
  return (data ?? []).length > 0;
}
