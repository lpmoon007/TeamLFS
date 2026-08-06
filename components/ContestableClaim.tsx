'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { contestFinding } from '@/lib/profile-actions';
import type { LedgerClaim } from '@/lib/profile/ledger';

const STATUS_LABEL: Record<string, string> = {
  open: 'open', held: 'held', sharpened: 'sharpened', overturned: 'overturned', withdrawn: 'withdrawn', untested: 'untested',
};

// An open finding the leader can contest (Screen-14 §3). Contesting persists — the next run tests
// the claim first and the coach is told to argue the evidence, not restate the claim. This is a
// real state, not local UI: a finding you can't push back on is an assessment, not a conversation.
export function ContestableClaim({ c, readOnly = false }: { c: LedgerClaim; readOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const res = await contestFinding({ claimId: c.id, note });
    if (res.ok) { setOpen(false); router.refresh(); }
    setBusy(false);
  };
  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    const res = await contestFinding({ claimId: c.id, note: null });
    if (res.ok) router.refresh();
    setBusy(false);
  };

  return (
    <div className={`pf-claim ${c.status}${c.contested ? ' contested' : ''}`}>
      <div className="pf-claim-top">
        <span className="pf-claim-text">{c.text}</span>
        {c.contested ? <span className="pf-claim-status contested">contested</span> : <span className={`pf-claim-status ${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>}
      </div>
      {c.mechanism ? <div className="pf-claim-mech"><span className="pf-claim-mk">Why it matters</span>{c.mechanism}</div> : null}
      <div className="pf-claim-fals"><span className="pf-claim-fk">Overturned if:</span> {c.falsifier}</div>
      {c.contested && c.contestNote ? (
        <div className="pf-claim-contest">You said this doesn’t fit: “{c.contestNote}” — your next run tests it first, and the coach argues the evidence.</div>
      ) : null}
      <div className="pf-claim-foot">
        <span className="pf-claim-meta">Made run {c.madeAtRun}{c.gradedAtRun ? ` · graded run ${c.gradedAtRun}` : ''}</span>
        {readOnly ? null : (
          <span className="pf-claim-acts">
            <button className="pf-contest-btn ask" onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lfs:coach-ask', { detail: `Where did the finding "${c.text}" come from, and how much should I trust it?` })); }}>Ask the coach →</button>
            {c.contested ? (
              <button className="pf-contest-btn withdraw" disabled={busy} onClick={withdraw}>Withdraw contest</button>
            ) : (
              <button className="pf-contest-btn" disabled={busy} onClick={() => setOpen((o) => !o)}>This doesn’t fit me</button>
            )}
          </span>
        )}
      </div>
      {open && !c.contested && !readOnly ? (
        <div className="pf-contest-box">
          <div className="pf-contest-l">Why doesn’t this fit?</div>
          <p className="pf-contest-s">Your next run tests this claim first, and the coach argues from your evidence instead of restating it. Say what the finding gets wrong.</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. I do go back to people — just not in the first 24 hours, which the run didn’t capture." />
          <div className="pf-contest-row">
            <button className="btn primary" disabled={busy || note.trim().length < 4} onClick={submit}>{busy ? 'Logging…' : 'Contest this finding'}</button>
            <button className="btn ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
