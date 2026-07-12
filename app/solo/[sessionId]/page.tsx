import { loadSolo } from '@/lib/solo-data';
import { Notice } from '@/components/Notice';
import { SoloApp } from '@/components/solo/SoloApp';

// /solo/:sessionId?t=token&week=N — the solo participant front-end (the CEO hot seat).
// Phase 2: static read of a week from the DB + realtime subscribe. No AI, no clock yet.
export default async function SoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ t?: string; week?: string }>;
}) {
  const { sessionId } = await params;
  const { t, week } = await searchParams;
  const weekIdx = week ? Math.max(0, parseInt(week, 10) - 1 || 0) : 0;

  const res = await loadSolo(sessionId, t, weekIdx);
  if (!res.ok) {
    switch (res.reason) {
      case 'not_found':
        return <Notice title="Session not found" message="This link doesn't point to a live session." />;
      case 'invalid_token':
        return <Notice title="This link isn't valid" message="Your access link is invalid. Ask your facilitator for a fresh link." />;
      case 'not_solo':
        return <Notice title="Not a solo run" message="This session isn't a solo scenario." />;
      case 'no_content':
        return <Notice title="Scenario not ready" message="This scenario has no solo content seeded yet." />;
    }
  }
  // key by week so navigating Continue → Week N+1 REMOUNTS with fresh state
  // (otherwise the prior week's ruling persists and the decision dock never returns).
  return <SoloApp key={`${sessionId}:${res.bundle.weekIdx}`} bundle={res.bundle} />;
}
