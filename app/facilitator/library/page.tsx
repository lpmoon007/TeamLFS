import { isFacilitatorSession, facilitator } from '@/lib/facilitator-session';
import { listScenariosFull } from '@/lib/facilitator-actions';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';
import { ScenarioLibraryView } from '@/components/facilitator/ScenarioLibraryView';

// Admin — Scenario Library. Every authored scenario with its shape: mode, seats, difficulty,
// realism, pacing, whether it's team-castable, and how many sessions have run it. Filter by
// realism; drill into one to set up a session or edit it.
export default async function ScenarioLibraryPage() {
  if (!(await isFacilitatorSession())) return <FacilitatorLogin />;
  const [scenarios, me] = await Promise.all([listScenariosFull(), facilitator()]);

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
          <ScenarioLibraryView scenarios={scenarios} />
        </div>
      </div>
    </div>
  );
}
