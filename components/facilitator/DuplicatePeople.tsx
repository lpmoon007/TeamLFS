'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mergeDuplicatePeople, type DupGroup } from '@/lib/admin-actions';

// Admin: surface duplicate profiles (the same person split across >1 subject) and merge them
// into one, re-pointing every run, panel, claim and rep to a single canonical identity.
export function DuplicatePeople({ groups }: { groups: DupGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  if (!groups.length) return null;

  const merge = async () => {
    if (busy) return;
    setBusy(true);
    setFlash(null);
    const res = await mergeDuplicatePeople();
    setBusy(false);
    if (res.ok) { setFlash(`Merged ${res.groups} ${res.groups === 1 ? 'person' : 'people'} · removed ${res.removed} duplicate profile${res.removed === 1 ? '' : 's'}.`); router.refresh(); }
    else setFlash('Couldn’t merge — admin only.');
  };

  return (
    <section className="db-panel">
      <h2>Duplicate profiles <span className="pill draft">{groups.length} to merge</span></h2>
      <p className="db-sub">These people have more than one behavioral-memory profile (an older split between how the spine and accounts keyed identity). Merging keeps the one with the most runs and re-points everything else to it.</p>
      <div className="db-table-wrap">
        <table className="db-table">
          <thead><tr><th>Person</th><th>Profiles</th><th>Runs each</th><th>After merge</th></tr></thead>
          <tbody>
            {groups.map((g) => {
              const total = g.subjects.reduce((a, s) => a + s.runs, 0);
              return (
                <tr key={g.key}>
                  <td><strong>{g.subjects[0].displayName || g.subjects.find((s) => s.hasEmail)?.handle || g.subjects[0].handle}</strong></td>
                  <td>{g.subjects.length}</td>
                  <td className="db-dim">{g.subjects.map((s) => s.runs).join(' + ')}</td>
                  <td><b>{total}</b> run{total === 1 ? '' : 's'} on one profile</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ed-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={busy} onClick={merge}>{busy ? 'Merging…' : 'Merge duplicates'}</button>
        {flash ? <span className="ed-flash">{flash}</span> : null}
      </div>
    </section>
  );
}
