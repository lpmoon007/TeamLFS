import { loadRoster } from '@/lib/data';
import { Notice } from '@/components/Notice';

// Fallback seat-claim (handoff §2A): shown only when there is no/blank token.
// Pre-assigned magic links are the primary path; this is a backstop. Phase 2 is
// read-only — it shows the roster and which seats are taken. Claiming an unclaimed
// seat (a write) lands with the onboarding writes in a later phase.
export default async function LobbyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const roster = await loadRoster(sessionId);

  if (!roster) {
    return <Notice title="Session not found" message="This link doesn't point to a live session. Check with your facilitator." />;
  }
  if (roster.session.status === 'ended') {
    return <Notice title="This session has ended" message="The simulation is over." />;
  }

  return (
    <div className="notice-wrap">
      <div className="notice">
        <div className="wm">
          IN<span>COMMAND</span> · THE SIGNAL
        </div>
        <h1>Take your seat</h1>
        <p className="nm">
          You reached the lobby without a personal link. Your facilitator normally sends a
          link that puts you straight into your seat. Find your name below and ask for your
          link if you don't have it.
        </p>
        <div className="roster">
          {roster.seats.map((s) => (
            <div className="seat" key={s.key}>
              <div>
                <div className="s-name">{s.name}</div>
                <div className="s-role">{s.role}</div>
              </div>
              <div className="claimed">{s.claimed ? 'in use' : 'available'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
