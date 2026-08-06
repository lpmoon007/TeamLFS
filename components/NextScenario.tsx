'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startLeaderRun } from '@/lib/leader-actions';
import { summaryHtml } from '@/lib/summary-html';
import type { NextScenario as Nudge } from '@/lib/profile/next-scenario';

// The next-scenario nudge on the profile — the training-plan payoff. One grounded recommendation
// for the run that tests the leader's still-directional findings, with a one-tap start that drops
// them straight into it.

export function NextScenario({ nudge }: { nudge: Nudge | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!nudge) return null;

  const start = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await startLeaderRun(nudge.scenario.id);
      if (res.ok && res.url) router.push(res.url);
      else { setErr('Couldn’t start the run — try again.'); setBusy(false); }
    } catch { setErr('Couldn’t start the run — try again.'); setBusy(false); }
  };

  const s = nudge.scenario;
  return (
    <section className="pf-sec">
      <div className="pf-sec-h">{nudge.replay ? 'Your next run — go deeper' : 'Your next run — where the findings get tested'}</div>
      <p className="pf-lead" style={{ marginBottom: 14 }}>{nudge.reason}</p>
      <div className="ns-card">
        <div className="ns-card-main">
          <div className="ns-card-title">{s.title}{nudge.replay ? <span className="ns-replay">re-test</span> : null}</div>
          {s.summary ? <p className="ns-card-sum" dangerouslySetInnerHTML={{ __html: summaryHtml(s.summary) }} /> : null}
          <div className="ns-card-meta">
            {s.difficulty != null ? <span>Difficulty {s.difficulty.toFixed(1)}</span> : null}
            {s.weekCount != null ? <span>{s.weekCount} weeks</span> : null}
            <span className="ns-realism">{s.realism}</span>
          </div>
        </div>
        <div className="ns-card-act">
          <button className="btn primary" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start this run →'}</button>
          {err ? <span className="ed-flash err">{err}</span> : null}
        </div>
      </div>
    </section>
  );
}
