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
import { RepSection } from '@/components/RepSection';
import { Sailboat, type BoatPart } from '@/components/Sailboat';
import { repOptionsFor } from '@/lib/rep-options';
import type { RepRow } from '@/lib/rep';

const STATUS_LABEL: Record<string, string> = {
  open: 'open', held: 'held', sharpened: 'sharpened', overturned: 'overturned', withdrawn: 'withdrawn', untested: 'untested',
};
// one plain sentence per marker — a number with a sentence under it explains itself; a number alone doesn't
const MARKER_DESC: Record<string, string> = {
  A1: 'Whether you ask the second question, or stop at the first answer.',
  A2: 'Whether the size of your move matches the evidence in hand.',
  A3: 'Whether you reach the people who hold something material.',
  A4: 'Whether you say the hard thing to the person it lands on.',
  A5: 'The gap between what you said you’d do and what you did.',
  A6: 'Whether your judgement degrades as the situation does.',
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
        {c.mechanism ? <div className="pf-lg-f mech"><span className="pf-lg-fk">Why it matters</span>{c.mechanism}</div> : null}
        <div className="pf-lg-f"><span className="pf-lg-fk">Would be overturned by</span>{c.falsifier}</div>
        <div className="pf-lg-f res"><span className="pf-lg-fk">What happened</span>{WHAT_HAPPENED[c.status] ?? '—'}{c.gradedAtRun ? ` (graded run ${c.gradedAtRun})` : ''}</div>
      </div>
    </div>
  );
}

// the navy gap card — the single most important thing to work on, promoted out of a list.
function GapCard({ fp, transfer, nextTitle }: { fp: Fingerprint; transfer: Ledger['transfer']; nextTitle: string | null }) {
  const gap = fp.gap;
  const lowest = [...fp.markers].filter((m) => m.n >= 1 && !m.insufficient).sort((a, b) => a.avg - b.avg)[0] ?? null;
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

// the three-number key (Screen-15 §2d) — one small panel so 72 and 40/100 aren't read as the
// same kind of number.
function NumberKey() {
  return (
    <div className="pf-numkey">
      <div className="pf-numkey-h">Three numbers, deliberately different</div>
      <div className="pf-numkey-row"><b>Marker rates</b> the six on the fingerprint — difficulty-normalised, comparable across scenarios. Every longitudinal claim uses these.</div>
      <div className="pf-numkey-row"><b>Run score</b> the number in the run log — a weighted composite for that run; it won’t equal the average of the six.</div>
      <div className="pf-numkey-row"><b>Raw in-scenario scores</b> in your debriefs — they carry each scenario’s difficulty, so never compare them across runs.</div>
    </div>
  );
}

// "What one run can't tell you" (Screen-15 retention spec) — name the specific number and the
// specific ambiguity, and what the next run resolves. Deterministic from the markers.
function unknowns(fp: Fingerprint): string[] {
  const items: string[] = [];
  const real = [...fp.markers].filter((m) => m.n >= 1 && !m.insufficient).sort((a, b) => a.avg - b.avg);
  const low = real[0];
  const cond = fp.conditions.length ? fp.conditions.join(' / ') : 'one team disposition';
  if (low) items.push(`Your ${low.label.toLowerCase()} came in at ${low.avg}. I can’t yet tell whether that’s who you are or how this team was configured — you’ve played under ${cond} only, with no run under a different disposition to compare. That distinction is the difference between a habit and a condition, and it needs a second run.`);
  // a ceiling on one run is an observation, not a strength — name it as an open question
  const ceiling = fp.markers.find((m) => m.insufficient && m.n >= 1 && m.avg >= 90);
  if (ceiling) items.push(`Your ${ceiling.label.toLowerCase()} came in at the top of the scale on a single run. That’s an observation, not a strength — it hasn’t been tested against a team that pushes back with new facts rather than pressure, so there’s no telling yet whether it holds.`);
  if (fp.runs < 2) items.push(`Your trait posture is empty. Traits are what survive across different situations, and so far you’ve been in one.`);
  return items.slice(0, 4);
}

const UNLOCK_ROWS: { label: string; at: number }[] = [
  { label: 'Findings + falsifiers', at: 1 },
  { label: 'Six markers', at: 1 },
  { label: 'Claims graded held / overturned', at: 2 },
  { label: 'Trait vs. condition split', at: 2 },
  { label: 'Trait posture', at: 3 },
  { label: 'Trajectory plot', at: 3 },
  { label: 'Self-revision (“we got you wrong”)', at: 3 },
  { label: 'Invariant vs. gap verdict', at: 4 },
];
function UnlockTable({ runs }: { runs: number }) {
  const nowCol = runs <= 1 ? 1 : runs === 2 ? 2 : runs < 4 ? 3 : 4;
  return (
    <div className="pf-unlock">
      <div className="pf-unlock-h">What your profile can show you, by run</div>
      <div className="pf-unlock-grid">
        <div className="pf-unlock-cell head" />
        {[1, 2, 3, 4].map((r) => <div key={r} className={`pf-unlock-cell head${r === nowCol ? ' now' : ''}`}>{r === 3 ? 'Run 3+' : r === 4 ? 'Run 4+' : `Run ${r}`}</div>)}
        {UNLOCK_ROWS.map((row) => (
          <div className="pf-unlock-line" key={row.label}>
            <div className="pf-unlock-cell label">{row.label}</div>
            {[1, 2, 3, 4].map((r) => <div key={r} className={`pf-unlock-cell${r === nowCol ? ' now' : ''}`}>{r >= row.at ? <span className="pf-unlock-yes">✓</span> : <span className="pf-unlock-no">—</span>}</div>)}
          </div>
        ))}
      </div>
      <div className="pf-unlock-note">An instrument, not a game — no streaks, levels, or scores. Each row is a fact about what a second observation makes possible.</div>
    </div>
  );
}

export function ProfileView({ fp, ledger, name, decisions = [], nextScenario = null, preview = false, previewSubjectId, repCommitted = null }: { fp: Fingerprint | null; ledger: Ledger | null; name: string; decisions?: DecisionRow[]; nextScenario?: Nudge | null; preview?: boolean; previewSubjectId?: string; repCommitted?: RepRow | null }) {
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

  // the rep targets the UNSOLVED half of the gap — the weakest marker with a real reading,
  // never one at ceiling (those are excluded as insufficient). Fall back to A1 if none is scored.
  const realMarkers = fp.markers.filter((m) => m.n >= 1 && !m.insufficient);
  const repTarget = realMarkers.length ? realMarkers[realMarkers.length - 1].key : 'A1';
  const repOptions = repOptionsFor(repTarget);
  const repClaimId = ledger?.open.find((c) => c.marker === repTarget)?.id ?? null;

  // the six Tier-A markers as boat parts — fill is the rate, insufficient markers draw as a
  // hatched, unfilled sail (the sailboat is the profile's face, bound to live data).
  const boat: Record<string, BoatPart> = Object.fromEntries(
    fp.markers
      .filter((m) => m.key.startsWith('A'))
      .map((m) => [m.key, { key: m.key, name: m.label, value: m.insufficient ? null : m.avg, trend: m.trend, insufficient: !!m.insufficient } as BoatPart]),
  );

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

        <Sailboat parts={boat} />

        <PfAccordion
          title="Findings — each one is a claim your next run can overturn"
          sub={ledger && ledger.open.length ? `${ledger.open.length} open finding${ledger.open.length === 1 ? '' : 's'}` : 'none yet'}
        >
          {ledger && ledger.open.length && fp.runs < 2 ? (
            <div className="pf-untested">
              <b>These {ledger.open.length} claim{ledger.open.length === 1 ? '' : 's'} about you {ledger.open.length === 1 ? 'is' : 'are'} untested.</b> Each carries a specific observation that would overturn it — none has had the chance yet. Your next run grades them, whether they flatter you or not.
            </div>
          ) : null}
          {ledger?.narrative ? <p className="pf-narr">{ledger.narrative}</p> : null}
          {ledger && ledger.open.length ? (
            <div className="pf-claims">
              {ledger.open.map((c) => <ContestableClaim key={c.id} c={c} readOnly={preview} />)}
            </div>
          ) : (
            <p className="pf-empty">No findings yet — generate them from your record. A finding that cannot be overturned isn’t a finding, so each one comes with the exact observation that would prove it wrong.</p>
          )}
          {!preview && (fp.runs > (ledger?.profiledRun ?? 0) || !ledger?.open.length) ? (
            <GenerateFindings runNo={fp.runs} hasProfile={!!ledger?.open.length} />
          ) : null}
        </PfAccordion>

        <GapCard fp={fp} transfer={ledger?.transfer ?? null} nextTitle={nextScenario?.scenario.title ?? null} />

        <PfAccordion title="Your fingerprint — six universal behaviours" sub="six markers" pinned>
          <div className="pf-markers">
            {fp.markers.map((m) => (
              <div className={`pf-marker${m.insufficient ? ' insufficient' : ''}`} key={m.key}>
                <div className="pf-marker-top">
                  <span className="pf-marker-label">{m.label}
                    {MARKER_DESC[m.key] ? <span className="pf-marker-desc">{MARKER_DESC[m.key]}</span> : null}
                  </span>
                  {m.insufficient ? (
                    <span className="pf-marker-insuf">insufficient evidence</span>
                  ) : (
                    <span className="pf-marker-score">
                      {m.avg}<span className="pf-marker-max">/100</span>
                      {m.trend !== null && m.trend !== 0 ? <span className={`pf-trend ${m.trend > 0 ? 'up' : 'dn'}`}>{m.trend > 0 ? `▲${m.trend}` : `▼${Math.abs(m.trend)}`}</span> : null}
                    </span>
                  )}
                </div>
                <div className="pf-bar"><div className="pf-fill" style={{ width: m.insufficient ? '0%' : `${m.avg}%` }} /></div>
                <div className="pf-marker-meta">
                  {m.insufficient ? (
                    <span>{m.n >= 1 ? 'too few scoreable moments on a single run to state a rate' : 'not exercised in these runs yet'}</span>
                  ) : (
                    <>
                      <span className={`pf-conf ${m.confidence}`}>{CONF[m.confidence]}</span>
                      <span>·</span>
                      <span>{m.n} run{m.n === 1 ? '' : 's'}</span>
                      {m.conditions.length ? <><span>·</span><span>{m.conditions.join(', ')}</span></> : null}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PfAccordion>

        {/* the retention close — immediately under the fingerprint, while the numbers are still on screen */}
        {fp.runs < 3 && unknowns(fp).length ? (
          <section className="pf-sec pf-unknowns">
            <div className="pf-sec-h">What {fp.runs === 1 ? 'one run' : `${fp.runs} runs`} can’t tell you yet</div>
            <div className="pf-unk-list">
              {unknowns(fp).map((u, i) => <p className="pf-unk" key={i}>{u}</p>)}
            </div>
            {nextScenario ? (
              <p className="pf-unk-next">The run that closes the biggest of these: <b>{nextScenario.scenario.title}</b>{nextScenario.matchedMarker ? ` — it presses ${nextScenario.matchedMarker.toLowerCase()}, your weakest read so far` : ''}. If the number holds, it’s you; if it moves, it was the team. That’s a question only your next run can answer.</p>
            ) : null}
          </section>
        ) : null}

        {preview ? null : <NextScenario nudge={nextScenario} />}

        <RepSection options={repOptions} targetMarker={repTarget} sourceClaimId={repClaimId} committed={repCommitted} readOnly={preview} />

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

        {/* number key sits just above the run log — it explains numbers the reader has by now actually seen */}
        <NumberKey />

        <PfAccordion title="Run log" sub={`${fp.runLog.length} run${fp.runLog.length === 1 ? '' : 's'}`}>
          <div className="pf-runs">
            {fp.runLog.map((r, i) => (
              <a className="pf-run" key={i} href={r.debriefUrl}>
                <span className="pf-run-head">
                  <span className="pf-run-score">{r.score}</span>
                  <span className="pf-run-t">{r.scenario}</span>
                  <span className="pf-run-cond">{r.condition} team</span>
                  <span className="pf-run-when">{r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
                  <span className="pf-run-link">Debrief →</span>
                </span>
                {r.takeaway && r.takeaway !== '—' ? <span className="pf-run-take">{r.takeaway}</span> : null}
              </a>
            ))}
          </div>
        </PfAccordion>

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

        {ledger && ledger.graded.length ? (
          <PfAccordion title="The claim ledger — how prior findings held up" sub={`${ledger.graded.length} graded`} defaultOpen={false}>
            <p className="pf-lead" style={{ marginBottom: 14 }}>Confidence rises only when a claim survives a <b>new</b> condition — never by repetition. A claim never overturned or sharpened isn’t proof it’s right; it may just not have been tested.</p>
            <div className="pf-ldg">
              {ledger.graded.map((c) => <LedgerCard key={c.id} c={c} />)}
            </div>
          </PfAccordion>
        ) : null}

        {fp.runs < 4 ? <UnlockTable runs={fp.runs} /> : null}

        {preview ? null : <CheckBackPanel decisions={decisions} />}
      </div>

      <aside className="pf-rail">
        {preview ? <LeaderCoach subjectId={previewSubjectId} readOnly /> : <LeaderCoach />}
      </aside>
    </div>
  );
}
