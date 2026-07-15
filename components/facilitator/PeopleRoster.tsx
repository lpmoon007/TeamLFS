'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPerson, type PersonItem } from '@/lib/facilitator-actions';

// People roster — the players. A person is a cross-session subject; their runs accumulate
// into the profile the divergence quadrant + subject dashboard read.
export function PeopleRoster({ people, keyParam }: { people: PersonItem[]; keyParam: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim() && !email.trim()) return;
    setBusy(true);
    setFlash(null);
    const res = await createPerson({ name: name || email, email: email || undefined });
    setBusy(false);
    if (res.ok) { setName(''); setEmail(''); setFlash('Added'); router.refresh(); }
    else setFlash(`Couldn’t add: ${res.reason ?? 'error'}`);
  };

  return (
    <>
      <section className="db-panel">
        <h2>Add a person</h2>
        <div className="assign-add">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email (optional — stabilizes identity)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: 260 }} />
          <button className="btn primary" disabled={busy || (!name.trim() && !email.trim())} onClick={add}>{busy ? 'Adding…' : 'Add'}</button>
          {flash ? <span className={`ed-flash${flash.startsWith('Couldn') ? ' err' : ''}`}>{flash}</span> : null}
        </div>
      </section>

      <section className="db-panel">
        <h2>People <span className="db-dim" style={{ fontSize: 12, fontWeight: 400 }}>({people.length})</span></h2>
        {people.length === 0 ? (
          <p className="db-sub">No people yet. Add them above, or they’re created automatically when someone plays.</p>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead><tr><th>Name</th><th>Email</th><th>Runs</th><th></th></tr></thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td className="db-dim">{p.email ?? '—'}</td>
                    <td>{p.runs}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link className="btn ghost" href={`/facilitator/subject/${p.id}${keyParam}`}>Profile →</Link>
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
