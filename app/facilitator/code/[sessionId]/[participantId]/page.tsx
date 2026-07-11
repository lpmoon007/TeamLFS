import { facilitatorAllowed } from '@/lib/facilitator-session';
import { loadCodingTask } from '@/lib/facilitator-actions';
import { Notice } from '@/components/Notice';
import { CodingSurface } from '@/components/facilitator/CodingSurface';

// Human coding surface (Behavioral Memory Spine §3.3) — a trained coder scores a
// participant's traits from the cited Layer-1 evidence, as coder='human' rows, to
// measure AI-vs-human inter-rater reliability. Facilitator-gated.
export default async function CodingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string; participantId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { sessionId, participantId } = await params;
  const { key } = await searchParams;
  if (!(await facilitatorAllowed(key))) {
    return <Notice title="Not found" message="This link is invalid." />;
  }
  const task = await loadCodingTask(sessionId, participantId);
  if (!task.session || !task.participant) {
    return <Notice title="Not found" message="No such session or participant." />;
  }
  const kp = key ? `?key=${encodeURIComponent(key)}` : '';
  return <CodingSurface task={task} keyParam={kp} />;
}
