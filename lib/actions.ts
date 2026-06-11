'use server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Onboarding write: when the participant accepts the disclaimer the live session
 * begins for them — presence flips online (handoff §2A) and we append to the
 * capture log (§4 events). Kept minimal and server-side (service role).
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
    .select('id')
    .eq('id', params.participantId)
    .eq('session_id', params.sessionId)
    .eq('token', params.token)
    .maybeSingle<{ id: string }>();

  if (!participant) return { ok: false };

  await db
    .from('participants')
    .update({ present: true, joined_at: new Date().toISOString() })
    .eq('id', params.participantId);

  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    type: 'disclaimer_accepted',
    target: null,
    payload_json: {},
  });

  return { ok: true };
}

/** Capture-log helper for read-path interactions (brief/thread/email opens). */
export async function logEvent(params: {
  sessionId: string;
  participantId: string;
  type: string;
  target?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const db = createAdminClient();
  await db.from('events').insert({
    session_id: params.sessionId,
    participant_id: params.participantId,
    type: params.type,
    target: params.target ?? null,
    payload_json: params.payload ?? {},
  });
}
