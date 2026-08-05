'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { runPreflight, logDecision, resolveDecision, type Preflight, type DecisionRow } from '@/lib/preflight-actions';

// Before You Decide — describe a real decision, get the questions your record says you'll
// skip + a behavioural prediction, then log it so it comes back in two weeks as evidence.
export function PreflightTool({ decisions }: { decisions: DecisionRow[] }) {
  const router = useRouter();
  const [decision, setDecision] = useState('');
  const [who, setWho] = useState('');
  const [when, setWhen] = useState('this week');
  const [busy, setBusy] = useState(false);
  const [pf, setPf] = useState<Preflight | null>(null);
  const [repaired, setRepaired] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  const REASON: Record<string, string> = {
    no_runs: 'Play and finish a run first — a pre-flight reads your pattern from your record.',
    no_api_key: 'The pre-flight isn’t configured yet (no API key).',
    grounding: 'I had a pre-flight and my own validator rejected it — it reached past your record. That’s the guardrail. Describe the call in plainer terms and run it again.',
    no_preflight: 'Couldn’t shape a grounded pre-flight for that — try describing the decision more plainly.',
    too_short: 'Give me a sentence or two about the decision.',
    model_unreachable: 'Couldn’t reach the model just then — nothing lost, run it again.',
  };

  const run = async () => {
    if (decision.trim().length < 8 || busy) return;
    setBusy(true); setErr(null); setPf(null); setLogged(false);
    try {
      const res = await runPreflight({ decision, who, when });
      if (res.ok && res.preflight) { setPf(res.preflight); setRepaired(!!res.repaired); }
      else setErr(REASON[res.reason ?? ''] ?? 'Couldn’t run that just now — try again.');
    } catch { setErr('Couldn’t run that just now — try again.'); }
    finally { setBusy(false); }
  };

  const logIt = async () => {
    if (!pf) return;
    await logDecision({ text: decision, who, when, question: pf.questions[0]?.question, prediction: pf.afterwards?.prediction });
    setLogged(true);
    router.refresh();
  };

  const resolve = async (id: string, verdict: 'yes' | 'no' | 'skip') => {
    await resolveDecision({ id, verdict });
    router.refresh();
  };

  return (
    <>
      <section className="pf-sec">
        <div className="pf-sec-h">Describe the decision</div>
        <p className="pf-lead" style={{ marginBottom: 14 }}>It doesn’t know your situation — it knows how <b>you</b> decide. So it hands you the questions your record says you’ll skip. It never tells you what to do.</p>
        <div className="ff">
          <textarea className="ff-ta" value={decision} onChange={(e) => setDecision(e.target.value)} rows={2} placeholder="e.g. Whether to move the Halifax plant to four-day operations, which cuts about 40 shifts." />
          <div className="ff-row">
            <input className="ff-in" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Who does it land hardest on? (optional)" />
            <select className="ff-sel" value={when} onChange={(e) => setWhen(e.target.value)}>
              <option>today</option><option>this week</option><option>this month</option><option>this quarter</option>
            </select>
            <button className="btn primary" disabled={busy || decision.trim().length < 8} onClick={run}>{busy ? 'Reading your record…' : 'Run pre-flight'}</button>
          </div>
          {err ? <div className="ff-err">{err}</div> : null}
        </div>
      </section>

      {pf ? (
        <section className="pf-sec ff-out">
          <div className="ff-read"><div className="ff-read-l">The read · your pattern against this shape of call</div><p>{pf.read}</p></div>
          <div className="ff-block">
            <div className="pf-sec-h">Three questions your record says you’ll skip</div>
            {pf.questions.map((q, i) => (
              <div className="ff-q" key={i}>
                <div className="ff-q-h"><span className="ff-q-i">{i + 1}</span><span className="ff-q-t">{q.question}</span></div>
                <div className="ff-q-w">{q.why}</div>
                {q.basis ? <span className="ff-q-b">{q.basis}</span> : null}
              </div>
            ))}
          </div>
          {pf.cue ? (
            <div className="ff-block">
              <div className="pf-sec-h">Your cue for this one</div>
              <div className="co-card cue" style={{ maxWidth: '100%' }}><div className="co-card-main">When {pf.cue.cue} — then {pf.cue.action}</div><div className="co-card-why">From: {pf.cue.anchor}</div></div>
            </div>
          ) : null}
          {pf.afterwards ? (
            <div className="ff-block">
              <div className="pf-sec-h">If you skip them anyway</div>
              <div className="ff-after"><p>{pf.afterwards.prediction}</p><span className="ff-q-b">{pf.afterwards.base_rate}</span></div>
              <div className="pf-transfer-label">A prediction about your behaviour — not the outcome, which nobody here knows.</div>
            </div>
          ) : null}
          {repaired ? <div className="co-flag">✓ checked against your log</div> : null}
          <div className="ff-acts">
            <button className="btn primary" disabled={logged} onClick={logIt}>{logged ? 'Logged ✓ — I’ll ask in two weeks' : 'Log this — ask me in two weeks'}</button>
          </div>
        </section>
      ) : null}

      {decisions.length ? (
        <section className="pf-sec">
          <div className="pf-sec-h">Your logged decisions</div>
          <div className="ff-log">
            {decisions.map((d) => (
              <div className={`ff-dec${d.due ? ' due' : ''}`} key={d.id}>
                <div className="ff-dec-text">{d.text}</div>
                {d.question ? <div className="ff-dec-line"><b>The question:</b> {d.question}</div> : null}
                {d.prediction ? <div className="ff-dec-line"><b>Predicted:</b> {d.prediction}</div> : null}
                {d.verdict ? (
                  <div className={`ff-dec-verd ${d.verdict}`}>{d.verdict === 'yes' ? 'Confirmed — held in practice, not just in a scenario. This is now the strongest evidence in your record.' : 'Wrong — logged against the claim it came from. A prediction that fails is worth more than one that succeeds; your next profile will narrow the finding.'}</div>
                ) : d.due ? (
                  <div className="ff-dec-ask">
                    <span>Two weeks on — did that happen?</span>
                    <div className="ff-dec-btns">
                      <button className="btn" onClick={() => resolve(d.id, 'yes')}>Yes</button>
                      <button className="btn" onClick={() => resolve(d.id, 'no')}>No</button>
                      <button className="btn ghost" onClick={() => resolve(d.id, 'skip')}>Not resolved yet</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
