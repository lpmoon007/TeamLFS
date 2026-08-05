import Link from 'next/link';
import { facilitator } from '@/lib/facilitator-session';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { listPlayableScenarios, getLeaderHome } from '@/lib/leader-actions';
import { PlayLibrary } from '@/components/PlayLibrary';
import { ChangePassword } from '@/components/facilitator/ChangePassword';

// The play-only surface — where a signed-in leader (or any account) picks a scenario and
// plays. No console, no session setup: pick → play, attributed to their memory profile.
export default async function PlayPage() {
  const me = await facilitator();
  if (!me) return <FacilitatorLogin />;
  const [scenarios, home] = await Promise.all([listPlayableScenarios(), getLeaderHome()]);

  return (
    <div className="play-wrap">
      <header className="play-head">
        <div className="wm">Leadership Failure <span>Simulations</span></div>
        <div className="play-head-r">
          <Link className="btn brief" href="/play/preflight">Before You Decide →</Link>
          <span className="play-who">{me.displayName || me.email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="play-body">
        {me.isMaster ? null : (
          <details className="play-acct">
            <summary>Account &amp; password</summary>
            <ChangePassword />
          </details>
        )}
        <PlayLibrary scenarios={scenarios} runs={home.runs} stats={home.stats} name={(me.displayName || me.email || '').split(' ')[0]} />
      </div>
    </div>
  );
}
