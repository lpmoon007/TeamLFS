import type { TeamMetricsResult } from '@/lib/team-metrics';

// Board 03 — "The Team as One" (Team Event-Log Spec §4). The four team-level vitals
// derived from the session's event stream. Metrics that the current room can't yet
// instrument (resilience, safety — they need proposal/stance signals) render honestly as
// "not yet instrumented" rather than a fake score. Small-N caveat per Spec §6.

const ORDER = ['airtime', 'resilience', 'coverage', 'safety'] as const;

export function TeamPanel({ panel }: { panel: TeamMetricsResult }) {
  const metrics = ORDER.map((k) => panel.metrics[k]).filter(Boolean);
  return (
    <section className="db-panel tb-panel">
      <div className="tb-head">
        <h2>The team as one</h2>
        <div className="tb-index">
          {panel.healthIndex !== null ? (
            <>
              <span className="tb-index-n">{panel.healthIndex}</span>
              <span className="tb-index-l">/ 100 collective health</span>
            </>
          ) : (
            <span className="tb-index-l">not yet scorable</span>
          )}
        </div>
      </div>
      <p className="db-sub">
        Team-level vitals — properties that exist only <em>between</em> people, so no individual board shows them.
        Single-session reads are directional, not precise (small-N).{panel.mixedRoom ? ' This room mixed human and AI-cast seats — AI seats are excluded from airtime and safety.' : ''}
      </p>
      <div className="tb-grid">
        {metrics.map((m) => (
          <div className={`tb-vital ${m.exercised ? '' : 'na'}`} key={m.key}>
            <div className="tb-vital-top">
              <b>{m.label}</b>
              {m.exercised && m.score !== null ? <span className="tb-sc">{m.score}<span className="tb-sc-max"> / 100</span></span> : <span className="tb-sc na">not yet instrumented</span>}
            </div>
            {m.exercised && m.score !== null ? (
              <div className="tb-bar">
                <div className="tb-fill" style={{ width: `${m.score}%` }} />
              </div>
            ) : null}
            <div className="tb-note">{m.note}</div>
            {m.key === 'coverage' && m.exercised && m.evidence ? (
              <div className="tb-ev">{m.evidence.surfaced}/{m.evidence.total} surfaced in time · {m.evidence.pulled ?? 0} pulled · {m.evidence.volunteered ?? 0} volunteered</div>
            ) : null}
            {m.key === 'airtime' && m.exercised && Array.isArray(m.evidence?.shares) ? (
              <div className="tb-shares">
                {m.evidence.shares.map((s: any) => (
                  <div className="tb-share" key={s.seat} title={`${s.seat}: ${Math.round(s.share * 100)}%`}>
                    <div className="tb-share-fill" style={{ width: `${Math.round(s.share * 100)}%` }} />
                    <span className="tb-share-lab">{s.seat} {Math.round(s.share * 100)}%</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
