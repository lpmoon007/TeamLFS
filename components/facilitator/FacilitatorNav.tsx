'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The admin console's left rail — connects Sessions + the scenario library/editor into one
// surface (prototype: TLFS Admin sidebar). Rendered by the authed facilitator pages.
const ITEMS = [
  { href: '/facilitator', label: 'Sessions', match: (p: string) => p === '/facilitator' || (p.startsWith('/facilitator/') && !p.startsWith('/facilitator/library')) },
  { href: '/facilitator/library', label: 'Scenario Library', match: (p: string) => p.startsWith('/facilitator/library') },
];

export function FacilitatorNav() {
  const path = usePathname() ?? '';
  return (
    <nav className="facnav">
      <div className="facnav-brand">
        IN<span>COMMAND</span>
        <div className="facnav-sub">Admin</div>
      </div>
      <div className="facnav-items">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className={`facnav-item${it.match(path) ? ' on' : ''}`}>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
