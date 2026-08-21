'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPerson, renamePerson, type PersonItem } from '@/lib/facilitator-actions';
import { createAccount, setAccountRole } from '@/lib/auth-actions';

// People roster — the players. A person is a cross-session subject; their runs accumulate
// into the profile the divergence quadrant + subject dashboard read. Admins can add a person
// as a login account (Leader / Facilitator / Admin) in one step — creating the account also
// provisions their play profile — or add a play-only person with no login.
export function PeopleRoster({ people, keyParam, canManageAccounts = false, meId }: { people: PersonItem[]; keyParam: string; canManageAccounts?: boolean; meId?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'player' | 'leader' | 'facilitator' | 'admin'>('player');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const startEdit = (p: PersonItem) => { setEditId(p.id); setEditName(p.name); setFlash(null); };
  const cancelEdit = () => { setEditId(null); setEditName(''); };
  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    const res = await renamePerson(id, editName);
    if (res.ok) { setEditId(null); setFlash('Name updated.'); router.refresh(); }
    else setFlash(`Couldn’t rename: ${res.reason ?? 'error'}`);
  };

  const changeRole = async (accountId: string, r: 'leader' | 'facilitator' | 'admin') => {
    const res = await setAccountRole(accountId, r);
    if (res.ok) { setFlash('Role updated — they get the new surface on their next sign-in.'); router.refresh(); }
    else setFlash(res.reason === 'cant_change_own_role' ? 'You can’t change your own role — ask another admin, or use the master key.' : `Couldn’t change role: ${res.reason ?? 'error'}`);
  };

  const isLogin = role !== 'player';
  const canAdd = isLogin ? !!email.trim() && password.length >= 8 : !!(name.trim() || email.trim());

  const add = async () => {
    if (!canAdd || busy) return;
    setBusy(true);
    setFlash(null);
    let res: { ok: boolean; reason?: string };
    if (isLogin) {
      // creating a login account also provisions the play profile (subject)
      res = await createAccount({ email: email.trim(), password, displayName: name.trim() || undefined, role });
    } else {
      res = await createPerson({ name: name || email, email: email || undefined });
    }
    setBusy(false);
    if (res.ok) {
      setName(''); setEmail(''); setPassword(''); setRole('player');
      setFlash(isLogin ? `${role[0].toUpperCase()}${role.slice(1)} account created` : 'Added');
      router.refresh();
    } else {
      setFlash(`Couldn’t add: ${res.reason === 'email_taken' ? 'that email already has an account' : res.reason ?? 'error'}`);
    }
  };

  return (
    <>
      <section className="db-panel">
        <h2>Add a person</h2>
        <div className="assign-add">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder={isLogin ? 'Email (required for login)' : 'Email (optional — stabilizes identity)'} value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: 240 }} />
          {canManageAccounts ? (
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="player">Player — no login</option>
              <option value="leader">Leader (play only)</option>
              <option value="facilitator">Facilitator</option>
              <option value="admin">Admin</option>
            </select>
          ) : null}
          {isLogin ? (
            <input type="text" placeholder="Temp password (≥ 8)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" style={{ width: 160 }} />
          ) : null}
          <button className="btn primary" disabled={busy || !canAdd} onClick={add}>{busy ? 'Adding…' : isLogin ? 'Create account' : 'Add'}</button>
          {flash ? <span className={`ed-flash${flash.startsWith('Couldn') ? ' err' : ''}`}>{flash}</span> : null}
        </div>
        {isLogin ? <p className="db-sub" style={{ marginTop: 8 }}>Creates a login account and their play profile. They sign in with this email + password{role === 'leader' ? ' and land straight on their play page.' : '.'}</p> : null}
      </section>

      <section className="db-panel">
        <h2>People <span className="db-dim" style={{ fontSize: 12, fontWeight: 400 }}>({people.length})</span></h2>
        {people.length === 0 ? (
          <p className="db-sub">No people yet. Add them above, or they’re created automatically when someone plays.</p>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead><tr><th>Name</th><th>Email</th><th>Account</th><th>Runs</th><th></th></tr></thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {editId === p.id ? (
                        <input className="rename-in" value={editName} autoFocus onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(p.id); if (e.key === 'Escape') cancelEdit(); }} />
                      ) : <strong>{p.name}</strong>}
                    </td>
                    <td className="db-dim">{p.email ?? '—'}</td>
                    <td>
                      {!p.role ? (
                        <span className="db-dim">no login</span>
                      ) : canManageAccounts && p.accountId && p.accountId !== meId ? (
                        <select className="role-sel" value={p.role} onChange={(e) => changeRole(p.accountId as string, e.target.value as 'leader' | 'facilitator' | 'admin')}>
                          <option value="leader">leader (play)</option>
                          <option value="facilitator">facilitator</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className={`cast-badge ${p.role === 'admin' ? 'human' : 'ai'}`} title={p.accountId === meId ? 'You can’t change your own role' : undefined}>{p.role}</span>
                      )}
                    </td>
                    <td>{p.runs > 0 ? <span className="pill live">{p.runs} run{p.runs === 1 ? '' : 's'}</span> : <span className="pill">never played</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {editId === p.id ? (
                        <>
                          <button className="btn primary" disabled={!editName.trim()} onClick={() => saveRename(p.id)}>Save</button>{' '}
                          <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn ghost" onClick={() => startEdit(p)}>Rename</button>{' '}
                          <Link className="btn ghost" href={`/facilitator/subject/${p.id}${keyParam}`}>Profile →</Link>
                        </>
                      )}
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
