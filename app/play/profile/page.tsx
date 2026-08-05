import Link from 'next/link';
import { facilitator } from '@/lib/facilitator-session';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buildFingerprintForEmail } from '@/lib/profile/fingerprint';
import { getLedgerForEmail } from '@/lib/profile/ledger';
import { ProfileView } from '@/components/ProfileView';

// The participant's own Leadership Profile — private to them (and their coach). Built from
// their behavioral-memory subject, resolved by email.
export default async function ProfilePage() {
  const me = await facilitator();
  if (!me) return <FacilitatorLogin />;
  const eligible = !me.isMaster && /@/.test(me.email);
  const [fp, ledger] = await Promise.all([
    eligible ? buildFingerprintForEmail(me.email) : null,
    eligible ? getLedgerForEmail(me.email) : null,
  ]);

  return (
    <div className="play-wrap">
      <header className="play-head">
        <div className="wm">Leadership Failure <span>Simulations</span></div>
        <div className="play-head-r">
          <Link className="btn" href="/play">← Play</Link>
          <Link className="btn brief" href="/play/preflight">Before You Decide →</Link>
          <span className="play-who">{me.displayName || me.email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="play-body">
        <ProfileView fp={fp} ledger={ledger} name={(me.displayName || me.email || '').split(' ')[0]} />
      </div>
    </div>
  );
}
