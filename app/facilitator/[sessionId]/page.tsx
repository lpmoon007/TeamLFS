import { redirect } from 'next/navigation';
import { isFacilitatorSession } from '@/lib/facilitator-session';
import { loadControl, listInjects } from '@/lib/facilitator-actions';
import { Notice } from '@/components/Notice';
import { SessionControl } from '@/components/facilitator/SessionControl';

// Live session control (Phase 8). Facilitator-gated.
export default async function SessionControlPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!(await isFacilitatorSession())) redirect('/facilitator');

  const [{ session, roster }, injects] = await Promise.all([loadControl(sessionId), listInjects(sessionId)]);
  if (!session) return <Notice title="Session not found" message="No session with that id." />;

  return <SessionControl session={session} roster={roster} injects={injects} />;
}
