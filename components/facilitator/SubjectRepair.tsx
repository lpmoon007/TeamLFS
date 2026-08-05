'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { relinkRunsByEmail } from '@/lib/admin-actions';

// Admin repair: re-attach runs whose participant email matches this person but whose subject
// link is missing/wrong (e.g. orphaned by an earlier merge). Email is the durable key.
export function SubjectRepair({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const relink = async () => {
    if (busy) return;
    setBusy(true);
    setFlash(null);
    const res = await relinkRunsByEmail(subjectId);
    setBusy(false);
    if (res.ok) { setFlash(res.relinked ? `Re-linked ${res.relinked} run${res.relinked === 1 ? '' : 's'} to this profile.` : 'Nothing to re-link — all runs already attached.'); router.refresh(); }
    else setFlash('Couldn’t re-link — admin only.');
  };

  return (
    <div className="ed-actions" style={{ marginTop: 10 }}>
      <button className="btn primary" disabled={busy} onClick={relink}>{busy ? 'Re-linking…' : 'Re-link runs by email'}</button>
      {flash ? <span className="ed-flash">{flash}</span> : null}
    </div>
  );
}
