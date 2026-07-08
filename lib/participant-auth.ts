import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Verify a magic-link token binds to this participant + a LIVE session. Shared by
// the server actions and the voice API routes. Returns the resolved seat + scenario.
export async function authParticipant(
  db: ReturnType<typeof createAdminClient>,
  p: { sessionId: string; participantId: string; token: string },
): Promise<{ seatId: string; scenarioId: string } | null> {
  const { data } = await db
    .from('participants')
    .select('id, seat_id, session:sessions!inner(status, scenario_id)')
    .eq('id', p.participantId)
    .eq('session_id', p.sessionId)
    .eq('token', p.token)
    .maybeSingle<any>();
  if (!data || data.session?.status !== 'live') return null;
  return { seatId: data.seat_id, scenarioId: data.session.scenario_id };
}
