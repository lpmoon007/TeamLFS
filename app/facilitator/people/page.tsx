import { requireStaffPage, facilitator, isAdmin } from '@/lib/facilitator-session';
import { listPeople } from '@/lib/facilitator-actions';
import { findDuplicatePeople } from '@/lib/admin-actions';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';
import { PeopleRoster } from '@/components/facilitator/PeopleRoster';
import { DuplicatePeople } from '@/components/facilitator/DuplicatePeople';

// Admin — the people roster (players). Add people, see their run counts, drill into their
// cross-session profile.
export default async function PeoplePage() {
  if ((await requireStaffPage()) === 'login') return <FacilitatorLogin />;
  const [me, people, admin] = await Promise.all([facilitator(), listPeople(), isAdmin()]);
  const dupes = admin ? await findDuplicatePeople() : [];

  return (
    <div className="fac-shell">
      <FacilitatorNav user={me} />
      <div className="fac">
        <header className="fac-head">
          <div className="wm">Leadership Failure <span>Simulations</span> · PEOPLE</div>
          <div className="spacer" />
        </header>
        <div className="fac-body">
          <div className="fac-body-top"><h1>People</h1></div>
          {admin ? <DuplicatePeople groups={dupes} /> : null}
          <PeopleRoster people={people} keyParam="" canManageAccounts={admin} meId={me?.id} />
        </div>
      </div>
    </div>
  );
}
