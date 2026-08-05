'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { relinkRunsByEmail, attachParticipant } from '@/lib/admin-actions';

// Admin repair for a subject: re-link runs by email (the durable key), and claim individual
// orphaned runs (a scored participant with no subject — e.g. nulled by an earlier merge).
export function SubjectRepair({ subjectId, orphans }: { subjectId: string; orphans: { participantId: string; name: string | null; scenario: string; status: string; overall: number | null }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const relink = async () => {
    if (busy) return;
    setBusy('relink'); setFlash(null);
    const res = await relinkRunsByEmail(subjectId);
    setBusy(null);
    if (res.ok) { setFlash(res.relinked ? `Re-linked ${res.relinked} run(s) by email.` : 'No email-matched runs to re-link.'); router.refresh(); }
    else setFlash('Couldn’t re-link — admin only.');
  };

  const attach = async (pid: string) => {
    if (busy) return;
    setBusy(pid); setFlash(null);
    const res = await attachParticipant(subjectId, pid);
    setBusy(null);
    if (res.ok) { setFlash('Run attached to this profile.'); router.refresh(); }
    else setFlash('Couldn’t attach.');
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div className="ed-actions">
        <button className="btn ghost" disabled={busy === 'relink'} onClick={relink}>{busy === 'relink' ? 'Re-linking…' : 'Re-link runs by email'}</button>
        {flash ? <span className="ed-flash">{flash}</span> : null}
      </div>
      {orphans.length ? (
        <>
          <p className="db-sub" style={{ marginTop: 14 }}>Orphaned runs (a scored run with no profile) — attach the one that’s theirs:</p>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead><tr><th>Player name</th><th>Scenario</th><th>Score</th><th></th></tr></thead>
              <tbody>
                {orphans.map((o) => (
                  <tr key={o.participantId}>
                    <td>{o.name ?? '—'}</td>
                    <td>{o.scenario} <span className="db-dim">({o.status})</span></td>
                    <td>{o.overall ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn primary" disabled={busy === o.participantId} onClick={() => attach(o.participantId)}>{busy === o.participantId ? 'Attaching…' : 'Attach to this profile'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
