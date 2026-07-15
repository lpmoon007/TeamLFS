import { isFacilitatorSession, facilitator } from '@/lib/facilitator-session';
import { listPeople } from '@/lib/facilitator-actions';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';
import { PeopleRoster } from '@/components/facilitator/PeopleRoster';

// Admin — the people roster (players). Add people, see their run counts, drill into their
// cross-session profile.
export default async function PeoplePage() {
  if (!(await isFacilitatorSession())) return <FacilitatorLogin />;
  const [me, people] = await Promise.all([facilitator(), listPeople()]);

  return (
    <div className="fac-shell">
      <FacilitatorNav user={me} />
      <div className="fac">
        <header className="fac-head">
          <div className="wm">IN<span>COMMAND</span> · PEOPLE</div>
          <div className="spacer" />
        </header>
        <div className="fac-body">
          <div className="fac-body-top"><h1>People</h1></div>
          <PeopleRoster people={people} keyParam="" />
        </div>
      </div>
    </div>
  );
}
