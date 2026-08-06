import type { Fingerprint } from '@/lib/profile/fingerprint';
import type { Ledger, LedgerClaim } from '@/lib/profile/ledger';
import type { DecisionRow } from '@/lib/preflight-actions';
import type { NextScenario as Nudge } from '@/lib/profile/next-scenario';
import { GenerateFindings } from '@/components/GenerateFindings';
import { PfAccordion } from '@/components/PfAccordion';
import { ContestableClaim } from '@/components/ContestableClaim';
import { CheckBackPanel } from '@/components/CheckBackPanel';
import { NextScenario } from '@/components/NextScenario';
import { LeaderCoach } from '@/components/LeaderCoach';

const STATUS_LABEL: Record<string, string> = {
  open: 'open', held: 'held', sharpened: 'sharpened', overturned: 'overturned', withdrawn: 'withdrawn', untested: 'untested',
};
// what the grade means, in plain words — the reference's "what happened" column
const WHAT_HAPPENED: Record<string, string> = {
  held: 'Tested and not overturned — it survived the falsifier.',
  sharpened: 'Narrowed — the claim was too broad; a tighter replacement is now open.',
  overturned: 'The falsifier was met — the claim was wrong, and that is on the record.',
  withdrawn: 'Withdrawn — it could not be evidenced, or was unfalsifiable as stated.',
  untested: 'No run has had a chance to test it yet.',
};

// The Leadership Profile — the private read across a person's runs (Screen-14 layout): a
// two-column page with the findings, fingerprint, navy gap card, claim ledger, trajectory and
// run log on the left, and the grounded coach pinned in a rail on the right.

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 160, h = 40;
  const max = Math.max(...points, 100), min = Math.min(...points, 0), span = max - min || 1;
  const xs = (i: number) => (i / (points.length - 1)) * (w - 6) + 3;
  const ys = (v: number) => h - 4 - ((v - min) / span) * (h - 8);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  return (
    <svg className="pf-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(points.length - 1)} cy={ys(points[points.length - 1])} r="3" fill="var(--accent)" />
    </svg>
  );
}

const CONF: Record<string, string> = { high: 'high confidence', moderate: 'moderate', provisional: 'provisional' };

// the rich claim-ledger card: the claim, its status badge, "would be overturned by" and
// "what happened", side by side (Run-04 reference).
function LedgerCard({ c }: { c: LedgerClaim }) {
  return (
    <div className={`pf-lg ${c.status}`}>
      <div className="pf-lg-h">
        <div className="pf-lg-q">{c.text}</div>
        <span className={`pf-lg-st ${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
      </div>
      <div className="pf-lg-b">
        <div className="pf-lg-f"><span className="pf-lg-fk">Would be overturned by</span>{c.falsifier}</div>
        <div className="pf-lg-f res"><span className="pf-lg-fk">What happened</span>{WHAT_HAPPENED[c.status] ?? '—'}{c.gradedAtRun ? ` (graded run ${c.gradedAtRun})` : ''}</div>
      </div>
    </div>
  );
}

// the navy gap card — the single most important thing to work on, promoted out of a list.
function GapCard({ fp, transfer, nextTitle }: { fp: Fingerprint; transfer: Ledger['transfer']; nextTitle: string | null }) {
  const gap = fp.gap;
  const lowest = [...fp.markers].filter((m) => m.n >= 1).sort((a, b) => a.avg - b.avg)[0] ?? null;
  const label = gap?.label ?? lowest?.label ?? null;
  const score = gap?.avg ?? lowest?.avg ?? null;
  if (!label) return null;
  return (
    <div className="pf-gapcard">
      <div className="pf-gap-l">{gap ? 'Your gap' : 'Your lowest read so far'}</div>
      <div className="pf-gap-t">{label}{score != null ? <span className="pf-gap-n"> · {score}/100</span> : null}</div>
      {gap ? (
        <p className="pf-gap-b">Across <b>{gap.n} comparable runs</b> this is where your read sits lowest. It’s a gap, not a verdict — it firms up, or gets overturned, the moment a run tests it under a new condition.</p>
      ) : (
        <p className="pf-gap-b">From <b>a single run</b>, so read it as directional — your lowest marker so far, not a settled trait. A second scenario is what tells you whether it’s a pattern or just that day.</p>
      )}
      {transfer?.watch_for ? <div className="pf-gap-then"><b>Watch for it at work:</b> {transfer.watch_for}</div> : null}
      {nextTitle ? <a className="pf-gap-cta" href="/play">Test it in {nextTitle} →</a> : null}
    </div>
  );
}

export function ProfileView({ fp, ledger, name, decisions = [], nextScenario = null }: { fp: Fingerprint | null; ledger: Ledger | null; name: string; decisions?: DecisionRow[]; nextScenario?: Nudge | null }) {
  if (!fp) {
    return (
      <div className="pf">
        <div className="pf-top">
          <h1 className="pf-h1">Your Leadership Profile</h1>
          <span className="pf-badge">Private</span>
        </div>
        <p className="pf-empty">Play a scenario and finish it, and your leadership profile starts building here — a read of how you lead that sharpens with every run.</p>
      </div>
    );
  }

  return (
    <div className="pf pf-grid">
      <div className="pf-main">
        <div className="pf-top">
          <h1 className="pf-h1">Your Leadership Profile</h1>
          <span className="pf-badge" title="Visible only to you and your coach — never to a manager or sponsor.">Private · you + your coach</span>
        </div>
        <p className="pf-lead">
          {name ? `${name}, this ` : 'This '} is your read across <b>{fp.runs} completed run{fp.runs === 1 ? '' : 's'}</b>
          {fp.conditions.length ? <> under <b>{fp.conditions.join(', ')}</b> teams</> : null}.
          {fp.provisional ? ' One run so far — treat this as directional; it firms up at two or three.' : ' Scored on difficulty-normalised rates, so it reads the same across scenarios.'}
        </p>

        <div className="pf-priv">
          <span className="pf-priv-lock" aria-hidden>🔒</span>
          <span><b>This page is private to you and your coach.</b> Your manager and the engagement’s sponsor cannot read it. They may receive a short development summary — themes, one growth focus, your next scenario — but only after you read the exact text and release it; withholding carries no penalty and is never reported as a refusal.</span>
        </div>
        <div className="pf-onion" aria-hidden>
          <span className="pf-onion-t">Every finding goes three layers deep:</span>
          <span className="pf-ostep on">Finding</span><span className="pf-oarr">→</span>
          <span className="pf-ostep">Contest it</span><span className="pf-oarr">→</span>
          <span className="pf-ostep">Take it to the coach</span>
        </div>

        <PfAccordion
          title="Findings — each one is a claim your next run can overturn"
          sub={ledger && ledger.open.length ? `${ledger.open.length} open finding${ledger.open.length === 1 ? '' : 's'}` : 'none yet'}
        >
          {ledger?.narrative ? <p className="pf-narr">{ledger.narrative}</p> : null}
          {ledger && ledger.open.length ? (
            <div className="pf-claims">
              {ledger.open.map((c) => <ContestableClaim key={c.id} c={c} />)}
            </div>
          ) : (
            <p className="pf-empty">No findings yet — generate them from your record. A finding that cannot be overturned isn’t a finding, so each one comes with the exact observation that would prove it wrong.</p>
          )}
          {fp.runs > (ledger?.profiledRun ?? 0) || !ledger?.open.length ? (
            <GenerateFindings runNo={fp.runs} hasProfile={!!ledger?.open.length} />
          ) : null}
        </PfAccordion>

        <GapCard fp={fp} transfer={ledger?.transfer ?? null} nextTitle={nextScenario?.scenario.title ?? null} />

        <NextScenario nudge={nextScenario} />

        {fp.trajectory.length >= 2 ? (
          <PfAccordion title="Trajectory" sub={`${fp.trajectory[0]} → ${fp.trajectory[fp.trajectory.length - 1]}`}>
            <div className="pf-traj">
              <Spark points={fp.trajectory} />
              <div className="pf-traj-n">{fp.trajectory[0]} → {fp.trajectory[fp.trajectory.length - 1]} <span>overall, first to latest run</span></div>
            </div>
          </PfAccordion>
        ) : null}

        {fp.strength ? (
          <PfAccordion title="Signature strength" sub={fp.strength.label}>
            <div className="pf-sig">
              <div className="pf-sig-card good">
                <div className="pf-sig-k">Your strength</div>
                <div className="pf-sig-v">{fp.strength.label}</div>
                <div className="pf-sig-sub">{fp.strength.avg}/100 avg over {fp.strength.n} runs</div>
              </div>
            </div>
          </PfAccordion>
        ) : null}

        <PfAccordion title="Your fingerprint — six universal behaviours" sub="six markers">
          <div className="pf-markers">
            {fp.markers.map((m) => (
              <div className="pf-marker" key={m.key}>
                <div className="pf-marker-top">
                  <span className="pf-marker-label">{m.label}</span>
                  <span className="pf-marker-score">
                    {m.avg}<span className="pf-marker-max">/100</span>
                    {m.trend !== null && m.trend !== 0 ? <span className={`pf-trend ${m.trend > 0 ? 'up' : 'dn'}`}>{m.trend > 0 ? `▲${m.trend}` : `▼${Math.abs(m.trend)}`}</span> : null}
                  </span>
                </div>
                <div className="pf-bar"><div className="pf-fill" style={{ width: `${m.avg}%` }} /></div>
                <div className="pf-marker-meta">
                  <span className={`pf-conf ${m.confidence}`}>{CONF[m.confidence]}</span>
                  <span>·</span>
                  <span>{m.n} run{m.n === 1 ? '' : 's'}</span>
                  {m.conditions.length ? <><span>·</span><span>{m.conditions.join(', ')}</span></> : null}
                </div>
              </div>
            ))}
          </div>
        </PfAccordion>

        <PfAccordion title="Run log" sub={`${fp.runLog.length} run${fp.runLog.length === 1 ? '' : 's'}`}>
          <div className="pf-runs">
            {fp.runLog.map((r, i) => (
              <a className="pf-run" key={i} href={r.debriefUrl}>
                <span className="pf-run-score">{r.score}</span>
                <span className="pf-run-t">{r.scenario}</span>
                <span className="pf-run-cond">{r.condition} team</span>
                <span className="pf-run-when">{r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
                <span className="pf-run-link">Debrief →</span>
              </a>
            ))}
          </div>
        </PfAccordion>

        {ledger && ledger.graded.length ? (
          <PfAccordion title="The claim ledger — how prior findings held up" sub={`${ledger.graded.length} graded`} defaultOpen={false}>
            <p className="pf-lead" style={{ marginBottom: 14 }}>Confidence rises only when a claim survives a <b>new</b> condition — never by repetition. A claim never overturned or sharpened isn’t proof it’s right; it may just not have been tested.</p>
            <div className="pf-ldg">
              {ledger.graded.map((c) => <LedgerCard key={c.id} c={c} />)}
            </div>
          </PfAccordion>
        ) : null}

        {ledger?.transfer ? (
          <PfAccordion title="Monday — how this shows up at work" sub="workplace transfer">
            <div className="pf-transfer">
              <div className="pf-transfer-tell">{ledger.transfer.tell}</div>
              <div className="pf-transfer-watch"><span className="pf-transfer-k">Watch for:</span> {ledger.transfer.watch_for}</div>
              <div className="pf-transfer-label">Coaching hypothesis — not an assessment.</div>
            </div>
            <a className="pf-preflight-link" href="/play/preflight">Facing a real decision? Run a pre-flight →</a>
          </PfAccordion>
        ) : (
          <p className="pf-preflight-cta">
            Facing a real decision at work? <a href="/play/preflight">Run it through Before You Decide →</a> — your record hands you the questions it says you’ll skip.
          </p>
        )}

        <CheckBackPanel decisions={decisions} />
      </div>

      <aside className="pf-rail">
        <LeaderCoach />
      </aside>
    </div>
  );
}
