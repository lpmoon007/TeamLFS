'use client';
import { useState, type ReactNode } from 'react';

// A collapsible profile section. The diagnostic blocks (findings, fingerprint, run log,
// ledger…) run long; folding them lets a leader jump to the action loops — next run,
// check-back, reps, coach — without scrolling past the whole read every time.
export function PfAccordion({ title, sub, defaultOpen = true, children }: { title: ReactNode; sub?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="pf-sec">
      <button type="button" className="pf-acc-h" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="pf-acc-caret" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="pf-acc-title">{title}</span>
        {!open && sub ? <span className="pf-acc-sum">{sub}</span> : null}
      </button>
      {open ? <div className="pf-acc-body">{children}</div> : null}
    </section>
  );
}
