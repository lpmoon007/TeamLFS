'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcast } from '@/lib/realtime-server';
import { seatChannel } from '@/lib/channels';
import type { EventChannel } from '@/lib/scoring/types';

/**
 * Onboarding write: when the participant accepts the disclaimer the live session
 * begins for them — presence flips online (handoff §2A) and we append to the
 * capture log (Behavioral Memory Spine Layer 1). Kept server-side (service role).
 */
export async function acceptDisclaimer(params: {
  sessionId: string;
  participantId: string;
  token: string;
}): Promise<{ ok: boolean }> {
  const db = createAdminClient();

  // Re-verify the token binds to this participant/session (defense in depth).
  const { data: participant } = await db
    .from('participants')
    .select('id, seat_id')
    .eq('id', params.participantId)
    .eq('session_id', params.sessionId)
    .eq('token', params.token)
    .maybeSingle<{ id: string; seat_id: string }>();

  if (!participant) return { ok: false };

  await db
    .from('participants')
    .update({ present: true, joined_at: new Date().toISOString() })
    .eq('id', params.participantId);

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: participant.seat_id,
    type: 'disclaimer_accepted',
    channel: 'system' as EventChannel,
    target: null,
    payload_json: {},
  });

  return { ok: true };
}

export interface SendMessageResult {
  ok: boolean;
  message?: { id: string; thread_id: string; sent_at: string };
}

/**
 * Phase 3 — send a message (participant → teammate or NPC contact).
 *  - Writes to the sender's own thread (sender='me').
 *  - If the recipient is a teammate (a participant on another seat), MIRRORS the
 *    message into their thread (sender=<sender seat key>) and broadcasts it to their
 *    seat channel for live delivery. NPC auto-replies come later (Phase 5/6).
 *  - Appends `message_sent` to the capture log (Layer 1) with the scoring-relevant
 *    context (target kind/section, out_group, length) so the scorer has evidence.
 * The DB is the source of truth; the broadcast is a delivery optimization.
 */
export async function sendMessage(params: {
  sessionId: string;
  participantId: string;
  token: string;
  contactKey: string;
  body: string;
}): Promise<SendMessageResult> {
  const db = createAdminClient();
  const body = params.body.trim();
  if (!body) return { ok: false };

  // Auth: token binds to this participant + session.
  const { data: me } = await db
    .from('participants')
    .select('id, seat_id, session:sessions!inner(id, scenario_id, status)')
    .eq('id', params.participantId)
    .eq('session_id', params.sessionId)
    .eq('token', params.token)
    .maybeSingle<any>();
  if (!me) return { ok: false };
  if (me.session?.status !== 'live') return { ok: false };
  const scenarioId: string = me.session.scenario_id;

  const { data: mySeat } = await db.from('seats').select('id, key').eq('id', me.seat_id).single<any>();

  // Is the recipient a teammate (a participant on a seat with this key)?
  const { data: recipSeat } = await db
    .from('seats')
    .select('id, key')
    .eq('scenario_id', scenarioId)
    .eq('key', params.contactKey)
    .maybeSingle<any>();
  let teammateSeat: { id: string; key: string } | null = null;
  if (recipSeat) {
    const { data: rp } = await db
      .from('participants')
      .select('id')
      .eq('session_id', params.sessionId)
      .eq('seat_id', recipSeat.id)
      .maybeSingle();
    if (rp) teammateSeat = recipSeat;
  }

  // Section (for scoring) when the recipient is an NPC contact.
  let section: string | null = teammateSeat ? 'TEAM' : null;
  if (!teammateSeat) {
    const { data: contact } = await db
      .from('contacts')
      .select('section')
      .eq('scenario_id', scenarioId)
      .eq('key', params.contactKey)
      .limit(1)
      .maybeSingle<any>();
    section = contact?.section ?? null;
  }

  // Sender's own thread + message.
  const { data: myThread } = await db
    .from('threads')
    .upsert(
      { session_id: params.sessionId, seat_id: me.seat_id, contact_key: params.contactKey, is_group: false },
      { onConflict: 'session_id,seat_id,contact_key' },
    )
    .select('id')
    .single<any>();

  const { data: myMsg } = await db
    .from('messages')
    .insert({ thread_id: myThread.id, sender: 'me', body })
    .select('id, sent_at')
    .single<any>();

  // Mirror into the teammate's thread + live-deliver.
  if (teammateSeat) {
    const { data: theirThread } = await db
      .from('threads')
      .upsert(
        { session_id: params.sessionId, seat_id: teammateSeat.id, contact_key: mySeat.key, is_group: false },
        { onConflict: 'session_id,seat_id,contact_key' },
      )
      .select('id')
      .single<any>();

    const { data: mirrored } = await db
      .from('messages')
      .insert({ thread_id: theirThread.id, sender: mySeat.key, body })
      .select('id, sent_at')
      .single<any>();

    await broadcast(seatChannel(params.sessionId, teammateSeat.key), 'message', {
      id: mirrored?.id,
      thread_id: theirThread.id,
      contact_key: mySeat.key,
      sender: mySeat.key,
      body,
      sent_at: mirrored?.sent_at,
    });
  }

  // Capture log (Layer 1) — pair with scoring-relevant context.
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: me.seat_id,
    type: 'message_sent',
    channel: 'message' as EventChannel,
    target: params.contactKey,
    payload_json: {
      body,
      length: body.length,
      target_kind: teammateSeat ? 'teammate' : 'npc',
      target_section: section,
      out_group: section === 'EXTERNAL',
    },
  });

  return { ok: true, message: { id: myMsg.id, thread_id: myThread.id, sent_at: myMsg.sent_at } };
}

/**
 * Capture-log helper for read-path interactions (Layer 1). Records the channel and
 * seat alongside the act so behavior is fully re-codable later (§1). Never writes
 * trait judgments — only what happened.
 */
export async function logEvent(params: {
  sessionId: string;
  participantId: string;
  seatId?: string | null;
  type: string;
  channel?: EventChannel;
  target?: string | null;
  scenarioMs?: number | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const db = createAdminClient();
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: params.seatId ?? null,
    type: params.type,
    channel: params.channel ?? null,
    target: params.target ?? null,
    scenario_ms: params.scenarioMs ?? null,
    payload_json: params.payload ?? {},
  });
}
