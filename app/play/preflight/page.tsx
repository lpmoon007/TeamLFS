import Link from 'next/link';
import { facilitator } from '@/lib/facilitator-session';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { listDecisions } from '@/lib/preflight-actions';
import { PreflightTool } from '@/components/PreflightTool';

// Before You Decide — the profile pointed forward at a real work decision. Private to the leader.
export default async function PreflightPage() {
  const me = await facilitator();
  if (!me) return <FacilitatorLogin />;
  const eligible = !me.isMaster && /@/.test(me.email);
  const decisions = eligible ? await listDecisions() : [];

  return (
    <div className="play-wrap">
      <header className="play-head">
        <div className="wm">Leadership Failure <span>Simulations</span></div>
        <div className="play-head-r">
          <Link className="btn" href="/play/profile">← Profile</Link>
          <span className="play-who">{me.displayName || me.email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="play-body">
        <div className="pf">
          <div className="pf-top">
            <h1 className="pf-h1">Before You Decide</h1>
            <span className="pf-badge">Private</span>
          </div>
          <PreflightTool decisions={decisions} />
        </div>
      </div>
    </div>
  );
}
