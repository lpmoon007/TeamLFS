import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Verify a magic-link token binds to a participant on a LIVE session. Shared by the
// server actions and the voice API routes.
//
// The TOKEN is the credential (unique per participant), so we match on (session_id,
// token) alone — matching the client-supplied participantId too was redundant and a
// silent failure point. We return the AUTHORITATIVE participant id so callers log
// against the right row. The session is fetched in a separate query (not an embed),
// which is shape-proof across PostgREST's object/array embedding.
export async function authParticipant(
  db: ReturnType<typeof createAdminClient>,
  p: { sessionId: string; token: string },
): Promise<{ participantId: string; seatId: string; scenarioId: string } | null> {
  if (!p.token) return null;
  const { data: participant } = await db
    .from('participants')
    .select('id, seat_id, session_id')
    .eq('session_id', p.sessionId)
    .eq('token', p.token)
    .maybeSingle<{ id: string; seat_id: string; session_id: string }>();
  if (!participant) return null;

  const { data: session } = await db
    .from('sessions')
    .select('status, scenario_id')
    .eq('id', participant.session_id)
    .maybeSingle<{ status: string; scenario_id: string }>();
  if (!session || session.status !== 'live') return null;

  return { participantId: participant.id, seatId: participant.seat_id, scenarioId: session.scenario_id };
}
