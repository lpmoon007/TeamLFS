import Link from 'next/link';
import { facilitatorAllowed, isStaff, isAdmin, facilitator } from '@/lib/facilitator-session';
import { inspectSubject } from '@/lib/admin-actions';
import { SubjectRepair } from '@/components/facilitator/SubjectRepair';
import { loadSubjectDashboard } from '@/lib/subject-dashboard';
import { getLedger } from '@/lib/profile/ledger';
import { buildNextScenarioForSubject } from '@/lib/profile/next-scenario';
import { listScenarios } from '@/lib/facilitator-actions';
import { StartSessionForPerson } from '@/components/facilitator/StartSessionForPerson';
import { SubjectProfilePanel } from '@/components/facilitator/SubjectProfilePanel';
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
  const canStart = await isStaff();
  const scenarios = canStart ? await listScenarios() : [];
  const admin = await isAdmin();
  const me = await facilitator();
  const self = !!me && !me.isMaster && me.email.toLowerCase() === d.handle.toLowerCase();
  const [diag, ledger, nextScenario] = admin
    ? await Promise.all([inspectSubject(subjectId), getLedger(subjectId), buildNextScenarioForSubject(subjectId)])
    : [null, null, null];

  return (
    <div className="debrief">
      <header className="db-head">
        <h1>{d.displayName}</h1>
        <div className="db-meta">
          {d.handle} · {d.allRuns.length} run{d.allRuns.length === 1 ? '' : 's'} on record
        </div>
      </header>

      {admin && nextScenario ? (
        <div className="db-next">
          <span className="db-next-k">Recommended next run</span>
          <span className="db-next-title">{nextScenario.scenario.title}</span>
          <span className="db-next-why">
            based on the Leadership Findings below —{' '}
            {nextScenario.replay
              ? 'a re-test to see whether the read holds a second time'
              : nextScenario.openFindings > 0
                ? `to test ${self ? 'your' : `${d.displayName.split(' ')[0]}’s`} ${nextScenario.openFindings} still-directional finding${nextScenario.openFindings === 1 ? '' : 's'} under a new condition`
                : `to make ${self ? 'your' : 'their'} markers comparable across conditions`}
          </span>
        </div>
      ) : null}

      {canStart ? (
        <section className="db-panel">
          <h2>{self ? 'Start your next session' : `Start a session with ${d.displayName.split(' ')[0]}`}</h2>
          <p className="db-sub">{self
            ? 'Pick a scenario — you’ll be in the lead seat, and the run attributes to your profile.'
            : 'Pick a scenario — they’ll be pre-assigned to the lead seat, and their runs attribute to this profile.'}</p>
          <StartSessionForPerson subjectId={subjectId} name={d.displayName} scenarios={scenarios} self={self} />
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
        {d.allRuns.length === 0 ? (
          <p className="db-sub">No completed runs yet — a run shows here once they reach the final weekly call.</p>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr><th>Scenario</th><th>Mode</th><th>Leadership</th><th>When</th><th>Debrief</th></tr>
              </thead>
              <tbody>
                {d.allRuns.map((r, i) => (
                  <tr key={i}>
                    <td>{r.scenario}</td>
                    <td>{r.mode}</td>
                    <td><b>{r.tierA ?? '—'}</b>{r.tierA !== null ? <span className="db-dim"> / 100</span> : null}</td>
                    <td className="db-dim">{r.at ? new Date(r.at).toLocaleDateString() : '—'}</td>
                    <td><Link href={`/facilitator/debrief/${r.sessionId}${kp}`}>open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {admin ? (
        <SubjectProfilePanel ledger={ledger} subjectId={subjectId} name={d.displayName} hasRuns={d.allRuns.length > 0} />
      ) : null}

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

      {diag ? (
        <section className="db-panel">
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>▸ Diagnostics (admin)</summary>
            <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.7 }}>
              <p className="db-sub">subject <code>{diag.subjectId}</code> · handle <code>{diag.handle}</code> · behavioral_panel rows: <b>{diag.panelRows}</b></p>
              {diag.otherSubjectsSameEmail.length ? (
                <p style={{ color: 'var(--warn)' }}>⚠ {diag.otherSubjectsSameEmail.length} other subject(s) still share this email — merge didn’t fully consolidate: {diag.otherSubjectsSameEmail.map((s) => `${s.handle} (${s.runs} runs, ${s.id})`).join(' · ')}</p>
              ) : <p className="db-sub">No other subjects share this email. ✓</p>}
              <div className="db-table-wrap" style={{ marginTop: 8 }}>
                <table className="db-table">
                  <thead><tr><th>Scenario</th><th>Token?</th><th>Cast</th><th>Debrief</th><th>Overall</th><th>Decisions/Weeks</th><th>In fingerprint?</th></tr></thead>
                  <tbody>
                    {diag.participants.length === 0 ? (
                      <tr><td colSpan={7} className="db-dim">No participants linked to this subject.</td></tr>
                    ) : diag.participants.map((r) => (
                      <tr key={r.participantId}>
                        <td>{r.scenario} <span className="db-dim">({r.status})</span>{!r.scenarioExists ? <span style={{ color: 'var(--danger)' }}> · scenario_id {r.scenarioId ?? 'null'} not found</span> : null}</td>
                        <td>{r.hasToken ? 'yes' : 'NO'}</td>
                        <td>{r.castKind ?? '—'}</td>
                        <td>{r.debriefOk ? 'ok' : <span style={{ color: 'var(--danger)' }}>{r.debriefReason ?? 'fail'}</span>}</td>
                        <td>{r.overall ?? '—'}</td>
                        <td>{r.decisions ?? '—'} / {r.weekCount ?? '?'}</td>
                        <td>{r.includedInFingerprint ? 'yes' : <span style={{ color: 'var(--warn)' }}>no</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="db-sub" style={{ marginTop: 12 }}>Participants whose email = <code>{diag.handle}</code> (any subject — orphans show as ⚠):</p>
              {diag.emailMatches.length === 0 ? (
                <p className="db-sub">None found by email.</p>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead><tr><th>Scenario</th><th>Token?</th><th>Linked to this profile?</th></tr></thead>
                    <tbody>
                      {diag.emailMatches.map((m) => (
                        <tr key={m.id}>
                          <td>{m.scenario}</td>
                          <td>{m.hasToken ? 'yes' : 'NO'}</td>
                          <td>{m.subjectId === diag.subjectId ? 'yes' : <span style={{ color: 'var(--warn)' }}>⚠ {m.subjectId ? 'other subject' : 'ORPHANED (no subject)'}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {diag.emailMatches.some((m) => m.subjectId !== diag.subjectId) || diag.orphanRuns.length ? (
                <SubjectRepair subjectId={diag.subjectId} orphans={diag.orphanRuns} />
              ) : null}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
