'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { facilitatorLogout } from '@/lib/facilitator-actions';
import { ThemeToggle } from '@/components/ThemeToggle';

// The admin console's left rail — connects Sessions + the scenario library/editor (and,
// for admins, Accounts) into one surface. Shows the signed-in identity + sign out.
export function FacilitatorNav({ user }: { user?: { displayName: string | null; email: string; role: string } | null }) {
  const path = usePathname() ?? '';
  const router = useRouter();
  const items = [
    { href: '/facilitator', label: 'Sessions', match: (p: string) => p === '/facilitator' || (p.startsWith('/facilitator/') && !p.startsWith('/facilitator/library') && !p.startsWith('/facilitator/accounts') && !p.startsWith('/facilitator/people') && !p.startsWith('/facilitator/account')) },
    { href: '/facilitator/library', label: 'Scenario Library', match: (p: string) => p.startsWith('/facilitator/library') },
    { href: '/facilitator/people', label: 'People', match: (p: string) => p.startsWith('/facilitator/people') },
    ...(user?.role === 'admin' ? [{ href: '/facilitator/accounts', label: 'Accounts', match: (p: string) => p.startsWith('/facilitator/accounts') }] : []),
    { href: '/facilitator/account', label: 'Account', match: (p: string) => p.startsWith('/facilitator/account') && !p.startsWith('/facilitator/accounts') },
  ];
  // Staff who also play have their own private Leadership Profile on the play surface — the
  // console has no other path to it. Hidden for the synthetic master key (no real profile).
  const canPlay = !!user && user.email !== 'master@local' && /@/.test(user.email);

  return (
    <nav className="facnav">
      <div className="facnav-brand">
        Leadership Failure <span>Simulations</span>
        <div className="facnav-sub">Admin</div>
      </div>
      <div className="facnav-items">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`facnav-item${it.match(path) ? ' on' : ''}`}>
            {it.label}
          </Link>
        ))}
        {canPlay ? (
          <Link href="/play/profile" className="facnav-item facnav-play">My Profile ↗</Link>
        ) : null}
      </div>
      {user ? (
        <div className="facnav-foot">
          <div className="facnav-who">
            <div className="facnav-name">{user.displayName || user.email}</div>
            <div className="facnav-role">{user.role}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="facnav-out" onClick={async () => { await facilitatorLogout(); router.refresh(); }}>Sign out</button>
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </nav>
  );
}
