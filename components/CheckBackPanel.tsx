'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveDecision, type DecisionRow } from '@/lib/preflight-actions';

// The pre-flight check-back on the profile. A decision the leader ran through Before-You-Decide
// carried a behavioural prediction; two weeks on this asks "did that happen?". A confirmed
// prediction is held-in-practice — the strongest evidence in the record; a wrong one narrows
// the claim it came from. This pulls the profile into their real week instead of leaving the
// check-back stranded on the pre-flight page they have to remember to reopen.

const DAY = 86_400_000;
const askDate = (createdAt: string) => new Date(new Date(createdAt).getTime() + 14 * DAY).toLocaleDateString();

export function CheckBackPanel({ decisions }: { decisions: DecisionRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (!decisions.length) return null;

  const due = decisions.filter((d) => d.due);
  const waiting = decisions.filter((d) => !d.due && !d.verdict);
  const resolved = decisions.filter((d) => d.verdict);

  const resolve = async (id: string, verdict: 'yes' | 'no' | 'skip') => {
    if (busy) return;
    setBusy(id);
    await resolveDecision({ id, verdict });
    router.refresh();
    setBusy(null);
  };

  return (
    <section className="pf-sec">
      <div className="pf-sec-h">Real-world check-backs — where a prediction becomes proof</div>

      {due.length ? (
        <div className="ff-log" style={{ marginBottom: waiting.length || resolved.length ? 18 : 0 }}>
          {due.map((d) => (
            <div className="ff-dec due" key={d.id}>
              <div className="ff-dec-text">{d.text}</div>
              {d.prediction ? <div className="ff-dec-line"><b>You predicted:</b> {d.prediction}</div> : null}
              <div className="ff-dec-ask">
                <span>Two weeks on — did that happen?</span>
                <div className="ff-dec-btns">
                  <button className="btn" disabled={busy === d.id} onClick={() => resolve(d.id, 'yes')}>Yes</button>
                  <button className="btn" disabled={busy === d.id} onClick={() => resolve(d.id, 'no')}>No</button>
                  <button className="btn ghost" disabled={busy === d.id} onClick={() => resolve(d.id, 'skip')}>Not yet</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {waiting.length ? (
        <div className="cb-waiting">
          {waiting.map((d) => (
            <div className="cb-wait" key={d.id}>
              <span className="cb-wait-t">{d.text}</span>
              <span className="cb-wait-when">checking back ~{askDate(d.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {resolved.length ? (
        <>
          {due.length || waiting.length ? <div className="sc-sub-h" style={{ marginTop: 18 }}>Checked back</div> : null}
          <div className="ff-log">
            {resolved.map((d) => (
              <div className="ff-dec" key={d.id}>
                <div className="ff-dec-text">{d.text}</div>
                {d.prediction ? <div className="ff-dec-line"><b>Predicted:</b> {d.prediction}</div> : null}
                <div className={`ff-dec-verd ${d.verdict}`}>
                  {d.verdict === 'yes'
                    ? 'Confirmed — held in practice, not just in a scenario. This is now the strongest evidence in your record.'
                    : 'Wrong — logged against the claim it came from. A prediction that fails is worth more than one that succeeds; your next profile narrows the finding.'}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {due.length ? null : (
        <a className="pf-preflight-link" href="/play/preflight">Facing another decision? Run a pre-flight →</a>
      )}
    </section>
  );
}
