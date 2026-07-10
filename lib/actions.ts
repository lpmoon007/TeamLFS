'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authParticipant } from '@/lib/participant-auth';
import { postSeatMessage } from '@/lib/message-core';
import { driveSeatReply } from '@/lib/agent-seat';
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

  // §8 consent — accepting the disclaimer is the consent to capture this session.
  // Retention beyond the session (org_longitudinal) stays opt-in (false here).
  const { data: existing } = await db
    .from('consents')
    .select('id')
    .eq('participant_id', params.participantId)
    .limit(1)
    .maybeSingle();
  if (!existing) {
    await db.from('consents').insert({
      participant_id: params.participantId,
      session_id: params.sessionId,
      consent_capture: true,
      consent_retention: false,
      retention_scope: 'session',
      policy_version: 'disclaimer-v1',
      granted_at: new Date().toISOString(),
    });
  }

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
 * Phase 3 — send a message (participant → teammate or NPC contact). Auth binds the
 * token to this participant/session, then the shared `postSeatMessage` core does the
 * delivery (own thread + teammate mirror + broadcast + `message_sent` capture).
 *
 * Phase 6 — "one engine": if the recipient is a teammate seat CAST AS AI, that seat
 * autonomously replies through the same core (`driveSeatReply`), best-effort so a model
 * hiccup never breaks the human's send. An AI occupant is a first-class participant.
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

  const post = await postSeatMessage(db, {
    sessionId: params.sessionId,
    scenarioId,
    senderParticipantId: params.participantId,
    senderSeat: { id: mySeat.id, key: mySeat.key },
    contactKey: params.contactKey,
    body,
  });
  if (!post.ok) return { ok: false };

  // one engine: an AI-cast teammate answers on its own, through the same rails.
  if (post.aiRecipient) {
    try {
      const { data: scn } = await db.from('scenarios').select('title').eq('id', scenarioId).maybeSingle<any>();
      await driveSeatReply(db, {
        sessionId: params.sessionId,
        scenarioId,
        companyName: scn?.title,
        ai: post.aiRecipient,
        toSeat: { id: mySeat.id, key: mySeat.key },
        incomingBody: body,
      });
    } catch {
      /* best-effort — the human's message already landed */
    }
  }

  return { ok: post.ok, message: post.message };
}

/** Phase 4 — mark an email read: stamp status/read_at and log `email_read` (Layer 1). */
export async function markEmailRead(params: {
  sessionId: string;
  participantId: string;
  token: string;
  emailId: string;
}): Promise<{ ok: boolean; read_at?: string }> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };

  // Only mark the email if it belongs to this seat, and only stamp read_at once.
  const { data: email } = await db
    .from('emails')
    .select('id, read_at')
    .eq('id', params.emailId)
    .eq('seat_id', auth.seatId)
    .maybeSingle<{ id: string; read_at: string | null }>();
  if (!email) return { ok: false };

  const readAt = email.read_at ?? new Date().toISOString();
  if (!email.read_at) {
    await db.from('emails').update({ status: 'read', read_at: readAt }).eq('id', params.emailId);
  }
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: 'email_read',
    channel: 'email' as EventChannel,
    target: params.emailId,
    payload_json: { first_open: !email.read_at },
  });
  return { ok: true, read_at: readAt };
}

export type DocAction = 'approve' | 'return' | 'edit';

/**
 * Phase 4 — act on an email's attached document. Writes the canonical capture-log
 * event (doc_approved | doc_returned | doc_edited, channel 'doc') and denormalizes
 * the terminal decision onto the email. Approve/Return are terminal; Edit is not.
 */
export async function documentAction(params: {
  sessionId: string;
  participantId: string;
  token: string;
  emailId: string;
  action: DocAction;
  payload?: { reason?: string; text?: string };
}): Promise<{ ok: boolean; decision?: 'approved' | 'returned' | null }> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };

  const { data: email } = await db
    .from('emails')
    .select('id, document_id, decision')
    .eq('id', params.emailId)
    .eq('seat_id', auth.seatId)
    .maybeSingle<{ id: string; document_id: string | null; decision: string | null }>();
  if (!email) return { ok: false };
  // A terminal decision is final.
  if (email.decision) return { ok: false, decision: email.decision as 'approved' | 'returned' };

  const type =
    params.action === 'approve' ? 'doc_approved' : params.action === 'return' ? 'doc_returned' : 'doc_edited';

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type,
    channel: 'doc' as EventChannel,
    target: email.document_id ?? params.emailId,
    payload_json: {
      email_id: params.emailId,
      reason: params.payload?.reason ?? null,
      edited_text: params.action === 'edit' ? params.payload?.text ?? null : null,
    },
  });

  if (params.action === 'edit') {
    await db
      .from('emails')
      .update({ decision_json: { edited_text: params.payload?.text ?? '' } })
      .eq('id', params.emailId);
    return { ok: true, decision: null };
  }

  const decision = params.action === 'approve' ? 'approved' : 'returned';
  await db
    .from('emails')
    .update({
      decision,
      decided_at: new Date().toISOString(),
      decision_json: { reason: params.payload?.reason ?? null },
    })
    .eq('id', params.emailId);
  return { ok: true, decision };
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

// =============================================================================
// Phase 6 — call lifecycle. The voice loop itself (STT → npc-reply → tts) runs
// through the /api/voice/* routes; these actions manage the call row + capture log.
// =============================================================================

/** Participant places an OUTBOUND call to a callable contact. Returns callId + opener. */
export async function placeCall(params: {
  sessionId: string;
  participantId: string;
  token: string;
  contactKey: string;
}): Promise<{ ok: boolean; callId?: string; opener?: string | null }> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };

  const { data: contact } = await db
    .from('contacts')
    .select('callable, opener')
    .eq('scenario_id', auth.scenarioId)
    .eq('key', params.contactKey)
    .limit(1)
    .maybeSingle<{ callable: boolean; opener: string | null }>();
  if (!contact?.callable) return { ok: false };

  const { data: call } = await db
    .from('calls')
    .insert({
      session_id: params.sessionId,
      seat_id: auth.seatId,
      contact_key: params.contactKey,
      direction: 'out',
      started_at: new Date().toISOString(),
      accepted: true,
    })
    .select('id')
    .single<{ id: string }>();
  if (!call) return { ok: false };

  // The NPC's opener is the first transcript turn.
  if (contact.opener) {
    await db.from('call_turns').insert({ call_id: call.id, who: 'them', text: contact.opener });
  }
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: 'call_placed',
    channel: 'call' as EventChannel,
    target: params.contactKey,
    payload_json: { call_id: call.id, direction: 'out' },
  });

  return { ok: true, callId: call.id, opener: contact.opener };
}

/** Accept or decline an INBOUND call (fired via inject). */
export async function respondToCall(params: {
  sessionId: string;
  participantId: string;
  token: string;
  callId: string;
  accept: boolean;
}): Promise<{ ok: boolean; opener?: string | null }> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };

  const { data: call } = await db
    .from('calls')
    .select('id, contact_key')
    .eq('id', params.callId)
    .eq('seat_id', auth.seatId)
    .maybeSingle<{ id: string; contact_key: string }>();
  if (!call) return { ok: false };

  await db
    .from('calls')
    .update({ accepted: params.accept, started_at: params.accept ? new Date().toISOString() : null })
    .eq('id', params.callId);

  let opener: string | null = null;
  if (params.accept) {
    const { data: contact } = await db
      .from('contacts')
      .select('opener')
      .eq('scenario_id', auth.scenarioId)
      .eq('key', call.contact_key)
      .limit(1)
      .maybeSingle<{ opener: string | null }>();
    opener = contact?.opener ?? null;
    if (opener) await db.from('call_turns').insert({ call_id: call.id, who: 'them', text: opener });
  }

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: params.accept ? 'call_accepted' : 'call_declined',
    channel: 'call' as EventChannel,
    target: call.contact_key,
    payload_json: { call_id: params.callId },
  });

  return { ok: true, opener };
}

/** End an active call: stamp ended_at + log call_ended. */
export async function endCall(params: {
  sessionId: string;
  participantId: string;
  token: string;
  callId: string;
}): Promise<{ ok: boolean }> {
  const db = createAdminClient();
  const auth = await authParticipant(db, params);
  if (!auth) return { ok: false };

  await db
    .from('calls')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', params.callId)
    .eq('seat_id', auth.seatId);

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    seat_id: auth.seatId,
    type: 'call_ended',
    channel: 'call' as EventChannel,
    target: params.callId,
    payload_json: {},
  });
  return { ok: true };
}
