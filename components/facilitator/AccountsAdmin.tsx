'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createAccount, setAccountActive, setAccountRole } from '@/lib/auth-actions';
import type { FacilitatorListItem } from '@/lib/auth';

export interface AccountlessPerson { id: string; name: string; email: string; runs: number }

// Admin — manage facilitator/admin accounts: list, create, deactivate/reactivate. Also flags
// people who have runs but no login (e.g. an account that went missing), so a profile with no
// way to sign in is visible here instead of a surprise.
export function AccountsAdmin({ accounts, orphans = [], meId }: { accounts: FacilitatorListItem[]; orphans?: AccountlessPerson[]; meId?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'facilitator' | 'admin' | 'leader'>('facilitator');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setFlash(null);
    const res = await createAccount({ email, password, displayName, role });
    setBusy(false);
    if (res.ok) {
      const created = role === 'leader' ? 'Leader account created' : 'Account created';
      setEmail(''); setDisplayName(''); setPassword(''); setRole('facilitator');
      setFlash(created);
      router.refresh();
    } else {
      setFlash(`Couldn’t create: ${res.reason ?? 'error'}`);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    await setAccountActive(id, active);
    router.refresh();
  };

  const changeRole = async (id: string, r: 'leader' | 'facilitator' | 'admin') => {
    const res = await setAccountRole(id, r);
    if (res.ok) { setFlash('Role updated — they get the new surface on their next sign-in.'); router.refresh(); }
    else setFlash(res.reason === 'cant_change_own_role' ? 'You can’t change your own role — ask another admin, or use the master key.' : `Couldn’t change role: ${res.reason ?? 'error'}`);
  };

  const prefill = (o: AccountlessPerson) => {
    setEmail(o.email); setDisplayName(o.name); setRole('leader');
    setFlash('Filled the form below — set a password and create to restore their login.');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {orphans.length ? (
        <section className="db-panel" style={{ borderLeft: '3px solid var(--warn)' }}>
          <h2>Runs but no login <span className="pill ended">{orphans.length}</span></h2>
          <p className="db-sub">These people have played but have no account to sign in with — so they can’t reach their own profile. If an account should exist (or went missing), create one with their exact email and it reconnects to this profile automatically.</p>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead><tr><th>Name</th><th>Email</th><th>Runs</th><th></th></tr></thead>
              <tbody>
                {orphans.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.name}</strong></td>
                    <td>{o.email}</td>
                    <td><span className="pill live">{o.runs} run{o.runs === 1 ? '' : 's'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link className="btn ghost" href={`/facilitator/subject/${o.id}`}>Profile →</Link>{' '}
                      <button className="btn ghost" onClick={() => prefill(o)}>Create login</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="db-panel">
        <h2>New account</h2>
        <div className="acct-form">
          <label className="ed-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
          <label className="ed-field"><span>Display name</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
          <label className="ed-field"><span>Temporary password <span className="db-dim">(≥ 8 chars)</span></span><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></label>
          <label className="ed-field ed-narrow"><span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as 'facilitator' | 'admin' | 'leader')}>
              <option value="leader">Leader (play only)</option>
              <option value="facilitator">Facilitator (runs the console)</option>
              <option value="admin">Admin (can manage accounts)</option>
            </select>
          </label>
          <div className="ed-actions">
            <button className="btn primary" disabled={busy || !email || password.length < 8} onClick={create}>{busy ? 'Creating…' : 'Create account'}</button>
            {flash ? <span className={`ed-flash${flash.startsWith('Couldn') ? ' err' : ''}`}>{flash}</span> : null}
          </div>
        </div>
      </section>

      <section className="db-panel">
        <h2>Accounts <span className="db-dim" style={{ fontSize: 12, fontWeight: 400 }}>({accounts.length})</span></h2>
        {accounts.length === 0 ? (
          <p className="db-sub">No accounts yet — create the first one above. (You’re signed in with the master key.)</p>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Runs</th><th>Last login</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} style={a.active ? undefined : { opacity: 0.55 }}>
                    <td>{a.email}</td>
                    <td>{a.displayName ?? '—'}</td>
                    <td>
                      {a.id === meId ? (
                        <span className={`cast-badge ${a.role === 'admin' ? 'human' : 'ai'}`} title="You can’t change your own role">{a.role}</span>
                      ) : (
                        <select className="role-sel" value={a.role} onChange={(e) => changeRole(a.id, e.target.value as 'leader' | 'facilitator' | 'admin')}>
                          <option value="leader">leader (play)</option>
                          <option value="facilitator">facilitator</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td>{a.runs > 0 ? <span className="pill live">{a.runs} run{a.runs === 1 ? '' : 's'}</span> : <span className="pill">never played</span>}</td>
                    <td className="db-dim">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : 'never'}</td>
                    <td><span className={`pill ${a.active ? 'live' : 'ended'}`}>{a.active ? 'active' : 'disabled'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {a.subjectId ? <><Link className="btn ghost" href={`/facilitator/subject/${a.subjectId}`}>Profile →</Link>{' '}</> : null}
                      <button className="btn ghost" onClick={() => toggle(a.id, !a.active)}>{a.active ? 'Deactivate' : 'Reactivate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
