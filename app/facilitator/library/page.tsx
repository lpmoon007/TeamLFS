import Link from 'next/link';
import { isFacilitatorSession, facilitator } from '@/lib/facilitator-session';
import { listScenariosFull } from '@/lib/facilitator-actions';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';

// Admin — Scenario Library. Every authored scenario with its shape: mode, seats, difficulty,
// pacing, whether it's team-castable, and how many sessions have run it. Drill into one to
// set up a session or edit it.
export default async function ScenarioLibraryPage() {
  if (!(await isFacilitatorSession())) return <FacilitatorLogin />;
  const [scenarios, me] = await Promise.all([listScenariosFull(), facilitator()]);
  const solo = scenarios.filter((s) => s.mode === 'solo');
  const team = scenarios.filter((s) => s.mode === 'team');

  const Card = ({ s }: { s: (typeof scenarios)[number] }) => (
    <Link href={`/facilitator/library/${s.id}`} className="lib-card">
      <div className="lib-card-top">
        <strong>{s.title}</strong>
        <span className={`cast-badge ${s.mode === 'solo' ? 'ai' : 'human'}`}>{s.mode}</span>
      </div>
      {s.summary ? <div className="lib-card-sub">{s.summary.slice(0, 120)}</div> : null}
      <div className="lib-card-meta">
        <span>{s.seats} seats</span>
        <span>·</span>
        <span>diff {s.difficulty}</span>
        {s.weekCount ? (<><span>·</span><span>{s.weekCount} wks</span></>) : null}
        {s.teamCastable ? (<><span>·</span><span className="lib-tc">team-castable</span></>) : null}
        <span>·</span>
        <span>{s.sessions} run{s.sessions === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );

  return (
    <div className="fac-shell">
      <FacilitatorNav user={me} />
      <div className="fac">
        <header className="fac-head">
          <div className="wm">IN<span>COMMAND</span> · SCENARIO LIBRARY</div>
          <div className="spacer" />
          <LogoutButton />
        </header>
        <div className="fac-body">
          <div className="fac-body-top">
            <h1>Scenario Library</h1>
          </div>
          {scenarios.length === 0 ? (
            <p className="db-sub">No scenarios seeded.</p>
          ) : (
            <>
              <div className="lib-section-h">Solo <span className="db-dim">({solo.length})</span></div>
              <div className="lib-grid">{solo.map((s) => <Card key={s.id} s={s} />)}</div>
              <div className="lib-section-h" style={{ marginTop: 26 }}>Team <span className="db-dim">({team.length})</span></div>
              <div className="lib-grid">{team.map((s) => <Card key={s.id} s={s} />)}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
