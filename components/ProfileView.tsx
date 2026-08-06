import type { Fingerprint } from '@/lib/profile/fingerprint';
import type { Ledger, LedgerClaim } from '@/lib/profile/ledger';
import type { DecisionRow } from '@/lib/preflight-actions';
import type { NextScenario as Nudge } from '@/lib/profile/next-scenario';
import { GenerateFindings } from '@/components/GenerateFindings';
import { PfAccordion } from '@/components/PfAccordion';
import { CheckBackPanel } from '@/components/CheckBackPanel';
import { NextScenario } from '@/components/NextScenario';
import { LeaderCoach } from '@/components/LeaderCoach';

const STATUS_LABEL: Record<string, string> = {
  open: 'open', held: 'held', sharpened: 'sharpened', overturned: 'overturned', withdrawn: 'withdrawn', untested: 'untested',
};

// The Leadership Profile — Phase 3: the fingerprint (six normalised markers averaged across
// runs), trajectory, signature strength/gap, and run log. The falsifiable claim ledger, the
// Monday transfer layer, and the prescribed rep arrive with the generation pipeline (Phase 4).
// Private to the participant + coach (visibility badge, spec §7).

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

function Claim({ c, showFalsifier = true }: { c: LedgerClaim; showFalsifier?: boolean }) {
  return (
    <div className={`pf-claim ${c.status}`}>
      <div className="pf-claim-top">
        <span className="pf-claim-text">{c.text}</span>
        <span className={`pf-claim-status ${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
      </div>
      {showFalsifier ? (
        <div className="pf-claim-fals"><span className="pf-claim-fk">Overturned if:</span> {c.falsifier}</div>
      ) : null}
      <div className="pf-claim-meta">
        Made run {c.madeAtRun}{c.gradedAtRun ? ` · graded run ${c.gradedAtRun}` : ''}{c.superseded ? ' · superseded by a sharper claim' : ''}
      </div>
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
    <div className="pf">
      <div className="pf-top">
        <h1 className="pf-h1">Your Leadership Profile</h1>
        <span className="pf-badge" title="Visible only to you and your coach — never to a manager or sponsor.">Private · you + your coach</span>
      </div>
      <p className="pf-lead">
        {name ? `${name}, this ` : 'This '} is your read across <b>{fp.runs} completed run{fp.runs === 1 ? '' : 's'}</b>
        {fp.conditions.length ? <> under <b>{fp.conditions.join(', ')}</b> teams</> : null}.
        {fp.provisional ? ' One run so far — treat this as directional; it firms up at two or three.' : ' Scored on difficulty-normalised rates, so it reads the same across scenarios.'}
      </p>

      <PfAccordion
        title="Findings — each one is a claim your next run can overturn"
        sub={ledger && ledger.open.length ? `${ledger.open.length} open finding${ledger.open.length === 1 ? '' : 's'}` : 'none yet'}
      >
        {ledger?.narrative ? <p className="pf-narr">{ledger.narrative}</p> : null}
        {ledger && ledger.open.length ? (
          <div className="pf-claims">
            {ledger.open.map((c) => <Claim key={c.id} c={c} />)}
          </div>
        ) : (
          <p className="pf-empty">No findings yet — generate them from your record. A finding that cannot be overturned isn’t a finding, so each one comes with the exact observation that would prove it wrong.</p>
        )}
        {fp.runs > (ledger?.profiledRun ?? 0) || !ledger?.open.length ? (
          <GenerateFindings runNo={fp.runs} hasProfile={!!ledger?.open.length} />
        ) : null}
      </PfAccordion>

      <NextScenario nudge={nextScenario} />

      {fp.trajectory.length >= 2 ? (
        <PfAccordion title="Trajectory" sub={`${fp.trajectory[0]} → ${fp.trajectory[fp.trajectory.length - 1]}`}>
          <div className="pf-traj">
            <Spark points={fp.trajectory} />
            <div className="pf-traj-n">{fp.trajectory[0]} → {fp.trajectory[fp.trajectory.length - 1]} <span>overall, first to latest run</span></div>
          </div>
        </PfAccordion>
      ) : null}

      {fp.strength || fp.gap ? (
        <PfAccordion title="Signature" sub={[fp.strength?.label, fp.gap?.label].filter(Boolean).join(' · ')}>
          <div className="pf-sig">
            {fp.strength ? (
              <div className="pf-sig-card good">
                <div className="pf-sig-k">Your strength</div>
                <div className="pf-sig-v">{fp.strength.label}</div>
                <div className="pf-sig-sub">{fp.strength.avg}/100 avg over {fp.strength.n} runs</div>
              </div>
            ) : null}
            {fp.gap ? (
              <div className="pf-sig-card warn">
                <div className="pf-sig-k">Your gap</div>
                <div className="pf-sig-v">{fp.gap.label}</div>
                <div className="pf-sig-sub">{fp.gap.avg}/100 avg over {fp.gap.n} runs</div>
              </div>
            ) : null}
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
        <PfAccordion title="The ledger — how prior findings held up" sub={`${ledger.graded.length} graded`} defaultOpen={false}>
          <p className="pf-lead" style={{ marginBottom: 14 }}>Confidence rises only when a claim survives a <b>new</b> condition — never by repetition. A claim that is never overturned or sharpened isn’t proof it’s right; it may just not have been tested.</p>
          <div className="pf-claims">
            {ledger.graded.map((c) => <Claim key={c.id} c={c} />)}
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

      <LeaderCoach />
    </div>
  );
}
