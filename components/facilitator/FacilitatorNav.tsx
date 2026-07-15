'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { facilitatorLogout } from '@/lib/facilitator-actions';

// The admin console's left rail — connects Sessions + the scenario library/editor (and,
// for admins, Accounts) into one surface. Shows the signed-in identity + sign out.
export function FacilitatorNav({ user }: { user?: { displayName: string | null; email: string; role: string } | null }) {
  const path = usePathname() ?? '';
  const router = useRouter();
  const items = [
    { href: '/facilitator', label: 'Sessions', match: (p: string) => p === '/facilitator' || (p.startsWith('/facilitator/') && !p.startsWith('/facilitator/library') && !p.startsWith('/facilitator/accounts') && !p.startsWith('/facilitator/people')) },
    { href: '/facilitator/library', label: 'Scenario Library', match: (p: string) => p.startsWith('/facilitator/library') },
    { href: '/facilitator/people', label: 'People', match: (p: string) => p.startsWith('/facilitator/people') },
    ...(user?.role === 'admin' ? [{ href: '/facilitator/accounts', label: 'Accounts', match: (p: string) => p.startsWith('/facilitator/accounts') }] : []),
  ];

  return (
    <nav className="facnav">
      <div className="facnav-brand">
        IN<span>COMMAND</span>
        <div className="facnav-sub">Admin</div>
      </div>
      <div className="facnav-items">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`facnav-item${it.match(path) ? ' on' : ''}`}>
            {it.label}
          </Link>
        ))}
      </div>
      {user ? (
        <div className="facnav-foot">
          <div className="facnav-who">
            <div className="facnav-name">{user.displayName || user.email}</div>
            <div className="facnav-role">{user.role}</div>
          </div>
          <button className="facnav-out" onClick={async () => { await facilitatorLogout(); router.refresh(); }}>Sign out</button>
        </div>
      ) : null}
    </nav>
  );
}
