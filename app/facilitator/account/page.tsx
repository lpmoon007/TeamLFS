import { requireStaffPage, facilitator } from '@/lib/facilitator-session';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';
import { ChangePassword } from '@/components/facilitator/ChangePassword';
import { Notice } from '@/components/Notice';

// Self-service account settings — every signed-in facilitator can change their own password.
export default async function AccountPage() {
  if ((await requireStaffPage()) === 'login') return <FacilitatorLogin />;
  const me = await facilitator();

  return (
    <div className="fac-shell">
      <FacilitatorNav user={me} />
      <div className="fac">
        <header className="fac-head">
          <div className="wm">IN<span>COMMAND</span> · ACCOUNT</div>
          <div className="spacer" />
        </header>
        <div className="fac-body">
          <div className="fac-body-top"><h1>Your account</h1></div>
          {me?.isMaster ? (
            <Notice
              title="Signed in with the master key"
              message="The master key is a shared bootstrap login with no account password. Create a real facilitator account under Accounts, then sign in with that email to manage your own password."
            />
          ) : (
            <>
              <section className="db-panel">
                <h2>Signed in as</h2>
                <p className="db-sub">{me?.displayName ? `${me.displayName} · ` : ''}{me?.email} <span className="db-dim">({me?.role})</span></p>
              </section>
              <ChangePassword />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
