'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewMerge, mergeDuplicatePeople, type DupGroup, type MergePreview } from '@/lib/admin-actions';

// Admin: surface duplicate profiles (the same person split across >1 subject) and merge them
// into one, re-pointing every run, panel, claim and rep to a single canonical identity.
// Two-step: preview exactly what moves, then confirm.
export function DuplicatePeople({ groups }: { groups: DupGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  if (!groups.length) return null;

  const runPreview = async () => {
    if (busy) return;
    setBusy(true); setFlash(null);
    try { setPreview(await previewMerge()); } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true); setFlash(null);
    const res = await mergeDuplicatePeople();
    setBusy(false);
    if (res.ok) { setPreview(null); setFlash(`Merged ${res.groups} ${res.groups === 1 ? 'person' : 'people'} · removed ${res.removed} duplicate profile${res.removed === 1 ? '' : 's'}.`); router.refresh(); }
    else setFlash('Couldn’t merge — admin only.');
  };

  return (
    <section className="db-panel">
      <h2>Duplicate profiles <span className="pill draft">{groups.length} to merge</span></h2>
      <p className="db-sub">These people have more than one behavioral-memory profile (an older split between how the spine and accounts keyed identity). Merging keeps the one with the most runs and re-points everything else to it — preview first.</p>

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

      {preview ? (
        <div className="db-preview">
          <div className="db-preview-h">Dry run — this is exactly what “Merge” will do. Nothing has changed yet.</div>
          {preview.groups.map((g) => (
            <div className="db-preview-g" key={g.keepId}>
              <div className="db-preview-keep"><span className="pill live">keep</span> <b>{g.handle}</b> <span className="db-dim">({g.keepHandle} · {g.keepRuns} run{g.keepRuns === 1 ? '' : 's'})</span></div>
              {g.remove.map((r) => (
                <div className="db-preview-rm" key={r.id}><span className="pill ended">remove</span> {r.handle} <span className="db-dim">· {r.runs} run{r.runs === 1 ? '' : 's'} · {r.moves} row{r.moves === 1 ? '' : 's'} re-pointed</span></div>
              ))}
            </div>
          ))}
          <div className="db-preview-tot">
            Rows re-pointed by table: {Object.entries(preview.byTable).filter(([, n]) => n > 0).map(([t, n]) => `${t.replace(/_/g, ' ')} ${n}`).join(' · ') || 'none'}
            {' · '}<b>{preview.totalRemoved}</b> duplicate profile{preview.totalRemoved === 1 ? '' : 's'} will be removed.
          </div>
          <div className="ed-actions" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={busy} onClick={confirm}>{busy ? 'Merging…' : 'Confirm merge'}</button>
            <button className="btn ghost" disabled={busy} onClick={() => setPreview(null)}>Cancel</button>
            {flash ? <span className="ed-flash">{flash}</span> : null}
          </div>
        </div>
      ) : (
        <div className="ed-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={busy} onClick={runPreview}>{busy ? 'Reading…' : 'Preview merge'}</button>
          {flash ? <span className="ed-flash">{flash}</span> : null}
        </div>
      )}
    </section>
  );
}
