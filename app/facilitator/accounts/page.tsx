import { requireStaffPage, facilitator, isAdmin } from '@/lib/facilitator-session';
import { listFacilitators } from '@/lib/auth';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';
import { AccountsAdmin } from '@/components/facilitator/AccountsAdmin';
import { Notice } from '@/components/Notice';

// Admin — account management. Admin-only (the master key counts as admin).
export default async function AccountsPage() {
  if ((await requireStaffPage()) === 'login') return <FacilitatorLogin />;
  const me = await facilitator();
  if (!(await isAdmin())) {
    return (
      <div className="fac-shell">
        <FacilitatorNav user={me} />
        <div className="fac"><Notice title="Admins only" message="Account management is restricted to admin accounts." /></div>
      </div>
    );
  }
  const accounts = await listFacilitators();

  return (
    <div className="fac-shell">
      <FacilitatorNav user={me} />
      <div className="fac">
        <header className="fac-head">
          <div className="wm">Leadership Failure <span>Simulations</span> · ACCOUNTS</div>
          <div className="spacer" />
        </header>
        <div className="fac-body">
          <div className="fac-body-top"><h1>Accounts</h1></div>
          <AccountsAdmin accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
