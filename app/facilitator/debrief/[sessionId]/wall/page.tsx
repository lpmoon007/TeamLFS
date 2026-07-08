import Link from 'next/link';
import { facilitatorAllowed } from '@/lib/facilitator-session';
import { buildDebrief } from '@/lib/debrief';
import { Notice } from '@/components/Notice';
import { CommsMap } from '@/components/facilitator/CommsMap';

// One Wall — the "room" altitude (Build Addendum A2). A big, minimal 16:9 projection
// with the facilitator reveal: show what happened, then reveal what didn't. Facilitator
// mode only.
export default async function OneWallPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { sessionId } = await params;
  const { key } = await searchParams;
  if (!(await facilitatorAllowed(key))) {
    return <Notice title="Not found" message="This link is invalid." />;
  }
  const d = await buildDebrief(sessionId);
  if (!d) return <Notice title="Session not found" message="No session with that id." />;
  const kp = key ? `?key=${encodeURIComponent(key)}` : '';

  return (
    <div className="wall">
      <div className="wall-head">
        <div className="wm">
          IN<span>COMMAND</span> · {d.scenario?.title ?? 'Session'}
        </div>
        <Link className="btn ghost" href={`/facilitator/debrief/${sessionId}${kp}`}>
          ← Team debrief
        </Link>
      </div>
      <div className="wall-stage">
        <CommsMap team={d.team} sessionId={sessionId} keyParam={kp} reveal="toggle" size={640} />
      </div>
      <div className="wall-legend">
        <span>
          <span className="lg-blue" /> spoke to each other
        </span>
        <span>
          <span className="lg-amber" /> critical conversation that never happened
        </span>
      </div>
    </div>
  );
}
