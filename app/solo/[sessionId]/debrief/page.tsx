import { buildSoloDebrief } from '@/lib/solo-debrief';
import { Notice } from '@/components/Notice';
import { SoloDebriefView } from '@/components/solo/SoloDebrief';

// /solo/:sessionId/debrief?t=token — the solo game-film debrief (Phase 5). Token-gated
// to the participant; read after the run's final week is decided.
export default async function SoloDebriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { sessionId } = await params;
  const { t } = await searchParams;

  const res = await buildSoloDebrief(sessionId, t);
  if (!res.ok) {
    switch (res.reason) {
      case 'not_found':
        return <Notice title="Session not found" message="This link doesn't point to a live session." />;
      case 'invalid_token':
        return <Notice title="This link isn't valid" message="Your access link is invalid. Ask your facilitator for a fresh link." />;
      case 'no_content':
        return <Notice title="Scenario not ready" message="This scenario has no solo content seeded yet." />;
      case 'no_run':
        return <Notice title="No run to debrief" message="This run has no decisions yet — play through the weeks first." />;
    }
  }
  return (
    <div className="soloui">
      <div className="stage">
        <div id="main">
          <SoloDebriefView d={res.debrief} />
        </div>
      </div>
    </div>
  );
}
