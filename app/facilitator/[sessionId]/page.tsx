import { redirect } from 'next/navigation';
import { isFacilitatorSession } from '@/lib/facilitator-session';
import { loadControl, listInjects, loadSoloControl, sessionMode, loadDirectorConfig } from '@/lib/facilitator-actions';
import { Notice } from '@/components/Notice';
import { SessionControl } from '@/components/facilitator/SessionControl';
import { SoloControl } from '@/components/facilitator/SoloControl';

// Live session control (Phase 8). Facilitator-gated. Solo runs get the solo console
// (disposition dial + advisor casting + ruling trail); team runs get the team console.
export default async function SessionControlPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!(await isFacilitatorSession())) redirect('/facilitator');

  const mode = await sessionMode(sessionId);
  if (mode === null) return <Notice title="Session not found" message="No session with that id." />;

  if (mode === 'solo') {
    const data = await loadSoloControl(sessionId);
    if (!data.session) return <Notice title="Session not found" message="No session with that id." />;
    return <SoloControl data={data} />;
  }

  const [{ session, roster }, injects, director] = await Promise.all([
    loadControl(sessionId),
    listInjects(sessionId),
    loadDirectorConfig(sessionId),
  ]);
  if (!session) return <Notice title="Session not found" message="No session with that id." />;
  return <SessionControl session={session} roster={roster} injects={injects} director={director} />;
}
