'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateForSubject } from '@/lib/profile-actions';
import { LeaderCoach } from '@/components/LeaderCoach';
import type { Ledger, LedgerClaim } from '@/lib/profile/ledger';

// Facilitator/coach view of a person's Leadership Profile — read-only findings + claim ledger
// + the grounded coach (coach-visibility per the consent model). Lets an admin review a
// person's full profile without logging in as them.

const STATUS_LABEL: Record<string, string> = { open: 'open', held: 'held', sharpened: 'sharpened', overturned: 'overturned', withdrawn: 'withdrawn', untested: 'untested' };

function Claim({ c }: { c: LedgerClaim }) {
  return (
    <div className={`pf-claim ${c.status}`}>
      <div className="pf-claim-top">
        <span className="pf-claim-text">{c.text}</span>
        <span className={`pf-claim-status ${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
      </div>
      <div className="pf-claim-fals"><span className="pf-claim-fk">Overturned if:</span> {c.falsifier}</div>
      <div className="pf-claim-meta">Made run {c.madeAtRun}{c.gradedAtRun ? ` · graded run ${c.gradedAtRun}` : ''}{c.superseded ? ' · superseded' : ''}</div>
    </div>
  );
}

export function SubjectProfilePanel({ ledger, subjectId, name, hasRuns }: { ledger: Ledger | null; subjectId: string; name: string; hasRuns: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const REASONS: Record<string, string> = {
    no_api_key: 'Findings generation isn’t configured (no API key).',
    no_runs: 'No completed run to profile yet.',
    nothing_grounded: 'Nothing could be evidenced from the record yet.',
    generation_failed: 'Couldn’t reach the model — try again.',
    forbidden: 'Admins only.',
  };

  const gen = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await generateForSubject(subjectId);
      // hard reload when rows actually landed — rules out RSC/router-cache staleness
      if (res.ok && (res.diag?.persisted ?? 1) > 0) { window.location.reload(); return; }
      if (res.ok) setErr('Generation reported success but nothing persisted — try again.');
      else setErr(REASONS[res.reason ?? ''] ?? 'Couldn’t generate — try again.');
    } catch (e) { setErr(`Couldn’t generate — ${e instanceof Error ? e.message : 'try again'}.`); }
    finally { setBusy(false); }
  };

  const hasFindings = !!ledger && ledger.open.length > 0;
  const [open, setOpen] = useState(true);

  return (
    <>
      <section className="db-panel">
        <button className="db-acc-h" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="db-acc-caret" aria-hidden>{open ? '▾' : '▸'}</span>
          <h2>Leadership findings <span className="pill draft">private · coach view</span></h2>
          {!open ? (
            <span className="db-acc-sum">{hasFindings ? `${ledger!.open.length} finding${ledger!.open.length === 1 ? '' : 's'}` : 'none yet'} · coach below</span>
          ) : null}
        </button>
        {open ? (
          <div className="db-acc-body">
            <p className="db-sub">{name.split(' ')[0]}’s falsifiable findings — each carries the observation that would overturn it. Read-only here; they generate from the person’s own runs.</p>
            {ledger?.narrative ? <p className="pf-narr">{ledger.narrative}</p> : null}
            {hasFindings ? (
              <div className="pf-claims">{ledger!.open.map((c) => <Claim key={c.id} c={c} />)}</div>
            ) : (
              <p className="db-sub">No findings generated yet{hasRuns ? ' — generate them from the record below.' : '. A finding needs a completed run first.'}</p>
            )}
            {ledger?.transfer ? (
              <div className="pf-transfer" style={{ marginTop: 14 }}>
                <div className="pf-transfer-tell">{ledger.transfer.tell}</div>
                <div className="pf-transfer-watch"><span className="pf-transfer-k">Watch for:</span> {ledger.transfer.watch_for}</div>
                <div className="pf-transfer-label">Coaching hypothesis — not an assessment.</div>
              </div>
            ) : null}
            {ledger && ledger.graded.length ? (
              <>
                <div className="sc-sub-h" style={{ marginTop: 18 }}>How prior findings held up</div>
                <div className="pf-claims">{ledger.graded.map((c) => <Claim key={c.id} c={c} />)}</div>
              </>
            ) : null}
            {hasRuns ? (
              <div className="ed-actions" style={{ marginTop: 14 }}>
                <button className="btn primary" disabled={busy} onClick={gen}>{busy ? 'Reading the record…' : hasFindings ? 'Re-grade findings' : 'Generate findings'}</button>
                {err ? <span className="ed-flash err">{err}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {hasRuns ? (
        <section className="db-panel">
          <LeaderCoach subjectId={subjectId} readOnly />
        </section>
      ) : null}
    </>
  );
}
