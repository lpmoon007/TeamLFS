import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcast } from '@/lib/realtime-server';
import { seatChannel } from '@/lib/channels';
import type { EventChannel } from '@/lib/scoring/types';

// The single message-delivery core of the team engine — the "one engine" seam
// (Roadmap Horizon 0: seat ≠ participant, every seat Human-or-AI). Both a human's
// `sendMessage` (after magic-link auth) and an AI-cast seat's autonomous reply
// (`driveSeatReply`) post through THIS function, so the two are structurally
// indistinguishable in the capture log: same threads, same mirror+broadcast, same
// `message_sent` event shape. An AI occupant is a first-class participant, not an NPC.

export interface PostResult {
  ok: boolean;
  message?: { id: string; thread_id: string; sent_at: string };
  // Set when the recipient is a teammate seat cast as AI — the caller (a human send)
  // uses this to drive that seat's reply. Null for NPC/human recipients.
  aiRecipient?: { participantId: string; seat: { id: string; key: string }; agentJson: any } | null;
}

export async function postSeatMessage(
  db: ReturnType<typeof createAdminClient>,
  params: {
    sessionId: string;
    scenarioId: string;
    senderParticipantId: string | null;
    senderSeat: { id: string; key: string };
    contactKey: string;
    body: string;
    agent?: boolean; // this send is AI-driven — marked on the event for auditability
  },
): Promise<PostResult> {
  const body = params.body.trim();
  if (!body) return { ok: false };

  // Is the recipient a teammate (a participant occupying a seat with this key)?
  const { data: recipSeat } = await db
    .from('seats')
    .select('id, key')
    .eq('scenario_id', params.scenarioId)
    .eq('key', params.contactKey)
    .maybeSingle<any>();
  let teammateSeat: { id: string; key: string } | null = null;
  let aiRecipient: PostResult['aiRecipient'] = null;
  if (recipSeat) {
    const { data: rp } = await db
      .from('participants')
      .select('id, cast_kind, agent_json')
      .eq('session_id', params.sessionId)
      .eq('seat_id', recipSeat.id)
      .maybeSingle<any>();
    if (rp) {
      teammateSeat = recipSeat;
      if (rp.cast_kind === 'ai') aiRecipient = { participantId: rp.id, seat: recipSeat, agentJson: rp.agent_json ?? {} };
    }
  }

  // Section (for scoring) when the recipient is an NPC contact.
  let section: string | null = teammateSeat ? 'TEAM' : null;
  if (!teammateSeat) {
    const { data: contact } = await db
      .from('contacts')
      .select('section')
      .eq('scenario_id', params.scenarioId)
      .eq('key', params.contactKey)
      .limit(1)
      .maybeSingle<any>();
    section = contact?.section ?? null;
  }

  // Sender's own thread + message.
  const { data: myThread } = await db
    .from('threads')
    .upsert(
      { session_id: params.sessionId, seat_id: params.senderSeat.id, contact_key: params.contactKey, is_group: false },
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
        { session_id: params.sessionId, seat_id: teammateSeat.id, contact_key: params.senderSeat.key, is_group: false },
        { onConflict: 'session_id,seat_id,contact_key' },
      )
      .select('id')
      .single<any>();

    const { data: mirrored } = await db
      .from('messages')
      .insert({ thread_id: theirThread.id, sender: params.senderSeat.key, body })
      .select('id, sent_at')
      .single<any>();

    await broadcast(seatChannel(params.sessionId, teammateSeat.key), 'message', {
      id: mirrored?.id,
      thread_id: theirThread.id,
      contact_key: params.senderSeat.key,
      sender: params.senderSeat.key,
      body,
      sent_at: mirrored?.sent_at,
    });
  }

  // Capture log (Layer 1) — same shape whether the sender is human or AI-cast.
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.senderParticipantId,
    seat_id: params.senderSeat.id,
    type: 'message_sent',
    channel: 'message' as EventChannel,
    target: params.contactKey,
    payload_json: {
      body,
      length: body.length,
      target_kind: teammateSeat ? 'teammate' : 'npc',
      target_section: section,
      out_group: section === 'EXTERNAL',
      recipients: [params.contactKey],
      addressed: [],
      ...(params.agent ? { agent: true } : {}),
    },
  });

  return { ok: true, message: { id: myMsg.id, thread_id: myThread.id, sent_at: myMsg.sent_at }, aiRecipient };
}
