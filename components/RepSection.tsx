'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { commitRep } from '@/lib/rep-actions';
import { MARKER_LABEL, type RepOption } from '@/lib/rep-options';
import type { RepRow } from '@/lib/rep';

const CHALLENGE = 'https://challenge.belegendary.org/';
// The challenge's signup form reads ?rep= and pre-fills the commitment; the #signup fragment
// drops the person straight onto that form. ref/src are ignored by the form but let consistency
// come back to the right person if the webhook is wired. Fragment MUST come last.
const handoffUrl = (rep: string, ref: string) =>
  `${CHALLENGE}?rep=${encodeURIComponent(rep)}&src=lfs${ref ? `&ref=${encodeURIComponent(ref)}` : ''}#signup`;

// The 30-day rep — the prescription half. Delivery lives at challenge.belegendary.org; this
// generates the rep from the gap, captures the obstacle, commits it, and hands off with the rep
// prefilled. The one rule that makes it work: the options target the UNSOLVED half of the gap
// (the caller passes the weakest marker, never a ceiling).
export function RepSection({
  options, targetMarker, sourceClaimId = null, committed = null, readOnly = false,
}: {
  options: RepOption[];
  targetMarker: string;
  sourceClaimId?: string | null;
  committed?: RepRow | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const [obstacle, setObstacle] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ url: string; rep: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const label = MARKER_LABEL[targetMarker] ?? 'your gap';

  // already committed — show the state, not the picker
  if (committed && committed.status !== 'abandoned' && !done) {
    return (
      <section id="rep" className="pf-sec pf-rep committed">
        <h2 className="pf-sec-h">Your 30-day rep</h2>
        <div className="pf-rep-committed">
          <div className="pf-rep-k">Committed · training {MARKER_LABEL[committed.targetMarker] ?? 'your gap'}</div>
          <p className="pf-rep-text">“{committed.repText}”</p>
          {committed.obstacle ? <p className="pf-rep-obs"><b>You named the obstacle:</b> {committed.obstacle}</p> : null}
          {committed.outcome ? (
            <p className="pf-rep-outcome">Kept {committed.daysLogged}/30 — <b>{committed.outcome.replace('_', ' ')}</b>. Your next profile pairs this against whether {label.toLowerCase()} actually moved.</p>
          ) : (
            <p className="pf-rep-sub">The daily nudge and rating live at the challenge. Your next profile pairs your consistency against whether {label.toLowerCase()} actually moved — that pairing is the point.</p>
          )}
          <a className="pf-rep-cta" href={handoffUrl(committed.repText, '')} target="_blank" rel="noreferrer">Open the challenge →</a>
        </div>
      </section>
    );
  }

  const commit = async () => {
    if (busy || !choice) return;
    setBusy(true);
    const res = await commitRep({ optionId: choice, targetMarker, sourceClaimId, obstacle: obstacle || null });
    setBusy(false);
    if (res.ok && res.ref !== undefined && res.repText) {
      const url = handoffUrl(res.repText, res.ref);
      setDone({ url, rep: res.repText });
      window.open(url, '_blank', 'noopener');
      router.refresh(); // update the header CTA state
    }
  };

  if (done) {
    return (
      <section id="rep" className="pf-sec pf-rep">
        <h2 className="pf-sec-h">Your 30-day rep</h2>
        <div className="pf-rep-committed">
          <div className="pf-rep-k">Committed · handed off to the challenge</div>
          <p className="pf-rep-text">“{done.rep}”</p>
          <p className="pf-rep-sub">A tab opened at <b>challenge.belegendary.org</b> with your rep prefilled. If it didn’t, use the link — no need to retype it.</p>
          <div className="pf-rep-row">
            <a className="pf-rep-cta" href={done.url} target="_blank" rel="noreferrer">Open the challenge →</a>
            <button className="pf-rep-copy" onClick={() => { navigator.clipboard?.writeText(done.rep); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy the rep'}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="rep" className="pf-sec pf-rep">
      <h2 className="pf-sec-h">Your 30-day rep</h2>
      <p className="pf-rep-lead">
        A profile that ends by telling you what to watch for and gives you no way to act on it is a report, not a change.
        Pick one small daily rep aimed at <b>{label.toLowerCase()}</b> — the half of the behaviour your record says you <i>haven’t</i> solved yet. It runs on the 30-Day Challenge; the nudge and the rating happen there.
      </p>
      <div className="pf-rep-opts">
        {options.map((o) => (
          <label className={`pf-rep-opt${choice === o.id ? ' on' : ''}`} key={o.id}>
            <input type="radio" name="rep" value={o.id} checked={choice === o.id} disabled={readOnly} onChange={() => setChoice(o.id)} />
            <span className="pf-rep-opt-body">
              <span className="pf-rep-opt-top"><span className="pf-rep-opt-text">{o.text}</span><span className={`pf-rep-diff ${o.difficulty.toLowerCase()}`}>{o.difficulty}</span></span>
              <span className="pf-rep-opt-targets">Trains: {o.targets}</span>
            </span>
          </label>
        ))}
      </div>

      {/* obstacle question — revealed after selection, before commit does anything */}
      {choice && !readOnly ? (
        <div className="pf-rep-obstacle">
          <div className="pf-rep-obs-q">What will most likely stop you doing this?</div>
          <p className="pf-rep-obs-s">One sentence. Naming the obstacle in advance is the single cheapest thing that raises follow-through — skippable, but worth it.</p>
          <textarea value={obstacle} onChange={(e) => setObstacle(e.target.value)} rows={2} placeholder="e.g. The 4 p.m. crunch — I’ll tell myself I’ll do it tomorrow." />
          <div className="pf-rep-commit-row">
            <button className="btn primary" disabled={busy} onClick={commit}>{busy ? 'Committing…' : 'Commit & start the rep →'}</button>
            <span className="pf-rep-commit-note">Opens the challenge with your rep prefilled.</span>
          </div>
        </div>
      ) : null}
      {readOnly ? <p className="pf-rep-sub">Committing a rep is available on your own profile.</p> : null}
    </section>
  );
}
