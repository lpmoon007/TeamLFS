'use client';
import { useState, type ReactNode } from 'react';

// A collapsible profile section. The diagnostic blocks (findings, fingerprint, run log,
// ledger…) run long; folding them lets a leader jump to the action loops — next run,
// check-back, reps, coach — without scrolling past the whole read every time.
export function PfAccordion({ title, sub, defaultOpen = true, pinned = false, children }: { title: ReactNode; sub?: ReactNode; defaultOpen?: boolean; pinned?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  // pinned sections (the fingerprint, the run-1 ending) are the argument, not detail — they
  // render as a plain headed section that can't be collapsed away.
  if (pinned) {
    return (
      <section className="pf-sec">
        <h2 className="pf-sec-h">{title}</h2>
        <div>{children}</div>
      </section>
    );
  }
  return (
    <section className="pf-sec">
      <button type="button" className="pf-acc-h" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="pf-acc-title">{title}</span>
        <span className="acc-right">
          {!open && sub ? <span className="pf-acc-sum">{sub}</span> : null}
          <span className="acc-toggle">{open ? 'Hide' : 'Show'}<span className="acc-chev" aria-hidden>{open ? '▲' : '▼'}</span></span>
        </span>
      </button>
      {open ? <div className="pf-acc-body">{children}</div> : null}
    </section>
  );
}
