import Link from 'next/link';
import { facilitatorAllowed, isFacilitatorSession } from '@/lib/facilitator-session';
import { loadSubjectDashboard } from '@/lib/subject-dashboard';
import { listScenarios } from '@/lib/facilitator-actions';
import { StartSessionForPerson } from '@/components/facilitator/StartSessionForPerson';
import { Notice } from '@/components/Notice';

// The longitudinal subject dashboard — a person's arc across sessions (Behavioral Memory
// Spine payoff). Facilitator-gated. Read-only aggregate over the versioned panel/profile.

const QUAD_LABEL: Record<string, string> = {
  multiplier: 'Multiplier',
  lone_genius: 'Lone Genius',
  connector: 'Connector',
  struggling: 'Still forming',
  na: '—',
};

export default async function SubjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { subjectId } = await params;
  const { key } = await searchParams;
  if (!(await facilitatorAllowed(key))) {
    return <Notice title="Not found" message="This link is invalid." />;
  }
  const d = await loadSubjectDashboard(subjectId);
  if (!d) return <Notice title="Not found" message="No such subject." />;
  const kp = key ? `?key=${encodeURIComponent(key)}` : '';
  const div = d.divergence;
  // starting a session needs a real facilitator login (not just a shared ?key= debrief link)
  const canStart = await isFacilitatorSession();
  const scenarios = canStart ? await listScenarios() : [];

  return (
    <div className="debrief">
      <header className="db-head">
        <div className="db-crumb"><strong>{d.displayName}</strong></div>
        <h1>{d.displayName}</h1>
        <div className="db-meta">
          {d.handle} · {d.sessions} session{d.sessions === 1 ? '' : 's'} on record · {d.runs.length} scored panel{d.runs.length === 1 ? '' : 's'}
        </div>
      </header>

      {canStart ? (
        <section className="db-panel">
          <h2>Start a session with {d.displayName.split(' ')[0]}</h2>
          <p className="db-sub">Pick a scenario — they’ll be pre-assigned to the lead seat, and their runs attribute to this profile.</p>
          <StartSessionForPerson subjectId={subjectId} name={d.displayName} scenarios={scenarios} />
        </section>
      ) : null}

      <section className="db-panel">
        <h2>Judgment × teaming — across sessions</h2>
        {div.quadrant !== 'na' ? (
          <div className="dq">
            <div className="dq-grid" aria-hidden>
              <div className="dq-cell">Connector</div>
              <div className="dq-cell hi">Multiplier</div>
              <div className="dq-cell">Still forming</div>
              <div className="dq-cell">Lone Genius</div>
              <div className="dq-dot" style={{ left: `${div.tierA ?? 0}%`, bottom: `${div.tierB ?? 0}%` }} />
            </div>
            <div className="dq-read">
              <div className="dq-label">{QUAD_LABEL[div.quadrant]}</div>
              <div className="dq-scores">
                Judgment <b>{div.tierA}</b> ({div.soloRuns} solo) · Teaming <b>{div.tierB}</b> ({div.teamRuns} team)
              </div>
              <p>{div.read}</p>
            </div>
          </div>
        ) : (
          <p className="db-sub">
            {div.teamRuns === 0
              ? 'No scored team run yet — the teaming axis unlocks once they play one.'
              : div.soloRuns === 0
                ? 'No scored solo run yet — the judgment axis unlocks once they play one.'
                : 'Both axes need a run to place them.'}
          </p>
        )}
        <div className="subj-tiles">
          <div className="subj-tile"><span className="subj-tile-n">{d.soloAvg ?? '—'}</span><span className="subj-tile-l">avg executive judgment (solo)</span></div>
          <div className="subj-tile"><span className="subj-tile-n">{d.teamAvg ?? '—'}</span><span className="subj-tile-l">avg teaming contribution (team)</span></div>
        </div>
      </section>

      <section className="db-panel">
        <h2>Run history</h2>
        {d.runs.length === 0 ? (
          <p className="db-sub">No scored panels yet.</p>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr><th>Scenario</th><th>Mode</th><th>Judgment (A)</th><th>Teaming (B)</th><th>Debrief</th></tr>
              </thead>
              <tbody>
                {d.runs.map((r, i) => (
                  <tr key={i}>
                    <td>{r.scenario}</td>
                    <td>{r.mode}</td>
                    <td>{r.tierA ?? '—'}</td>
                    <td>{r.tierB ?? '—'}</td>
                    <td><Link href={`/facilitator/debrief/${r.sessionId}${kp}`}>open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="db-panel">
        <h2>Trait posture <span className="db-dim" style={{ fontSize: 12, fontWeight: 400 }}>(confidence-weighted across sessions · v0.1 hypothesis)</span></h2>
        {d.posture.length === 0 ? (
          <p className="db-sub">No trait evidence accumulated yet.</p>
        ) : (
          <div className="db-traits">
            {d.posture.map((t) => (
              <div className="db-trait" key={t.key}>
                <span className="db-trait-key">{t.label}</span>
                <span className="db-trait-val">{t.pole ?? '—'} <span className="db-dim">({t.mean > 0 ? '+' : ''}{t.mean.toFixed(2)})</span></span>
                <span className="db-conf">{t.points} pt{t.points === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
