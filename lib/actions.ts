'use server';
import { createAdminClient } from '@/lib/supabase/admin';
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
