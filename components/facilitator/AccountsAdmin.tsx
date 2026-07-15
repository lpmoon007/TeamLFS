'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount, setAccountActive } from '@/lib/auth-actions';
import type { FacilitatorListItem } from '@/lib/auth';

// Admin — manage facilitator/admin accounts: list, create, deactivate/reactivate.
export function AccountsAdmin({ accounts }: { accounts: FacilitatorListItem[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'facilitator' | 'admin'>('facilitator');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setFlash(null);
    const res = await createAccount({ email, password, displayName, role });
    setBusy(false);
    if (res.ok) {
      setEmail(''); setDisplayName(''); setPassword(''); setRole('facilitator');
      setFlash('Account created');
      router.refresh();
    } else {
      setFlash(`Couldn’t create: ${res.reason ?? 'error'}`);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    await setAccountActive(id, active);
    router.refresh();
  };

  return (
    <>
      <section className="db-panel">
        <h2>New account</h2>
        <div className="acct-form">
          <label className="ed-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
          <label className="ed-field"><span>Display name</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
          <label className="ed-field"><span>Temporary password <span className="db-dim">(≥ 8 chars)</span></span><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></label>
          <label className="ed-field ed-narrow"><span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as 'facilitator' | 'admin')}>
              <option value="facilitator">Facilitator</option>
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
              <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Last login</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} style={a.active ? undefined : { opacity: 0.55 }}>
                    <td>{a.email}</td>
                    <td>{a.displayName ?? '—'}</td>
                    <td><span className={`cast-badge ${a.role === 'admin' ? 'human' : 'ai'}`}>{a.role}</span></td>
                    <td className="db-dim">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : 'never'}</td>
                    <td><span className={`pill ${a.active ? 'live' : 'ended'}`}>{a.active ? 'active' : 'disabled'}</span></td>
                    <td style={{ textAlign: 'right' }}>
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
