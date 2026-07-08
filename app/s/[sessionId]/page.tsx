import { redirect } from 'next/navigation';
import { resolveSeat } from '@/lib/data';
import { Notice } from '@/components/Notice';
import { ParticipantApp } from '@/components/participant/ParticipantApp';

// /s/:sessionId?t=token  → resolve token → seat; mount participant app.
// Guards (handoff §2A): missing token → lobby; invalid token / session draft /
// session ended → friendly notice.
export default async function SeatPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { sessionId } = await params;
  const { t } = await searchParams;

  if (!t) redirect(`/s/${sessionId}/lobby`);

  const result = await resolveSeat(sessionId, t);

  if (!result.ok) {
    switch (result.reason) {
      case 'session_not_found':
        return <Notice title="Session not found" message="This link doesn't point to a live session. Check with your facilitator." />;
      case 'invalid_token':
        return <Notice title="This link isn't valid" message="Your access link is invalid or has already been used. Ask your facilitator for a fresh link." />;
      case 'session_draft':
        return <Notice title="Not started yet" message="Your session hasn't begun. Keep this link — the screen will open when the facilitator starts the simulation." />;
      case 'session_ended':
        return <Notice title="This session has ended" message="The simulation is over. Your facilitator will take it from here for the debrief." />;
    }
  }

  return <ParticipantApp bundle={result.bundle} />;
}
