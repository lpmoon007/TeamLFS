'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  castSeat,
  recentEvents,
  setSoloDisposition,
  type FeedEvent,
  type SoloControlData,
} from '@/lib/facilitator-actions';
import { formatTime } from '@/lib/ui';

// Phase 8 — the solo-run facilitator console. One human CEO + AI advisor seats against
// the real-time weeks: the controls are the run-level DISPOSITION dial and advisor
// casting; the reads are the driver world-model, the per-week ruling trail, and the
// live event log.
export function SoloControl({ data }: { data: SoloControlData }) {
  const session = data.session!;
  const [disposition, setDisposition] = useState(data.disposition);
  const [savingDisp, setSavingDisp] = useState(false);
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  const poll = useCallback(async () => {
    try {
      setFeed(await recentEvents(session.id, 80));
    } catch {
      /* ignore */
    }
  }, [session.id]);
  useEffect(() => {
    void poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);

  const changeDisposition = async (next: string) => {
    setSavingDisp(true);
    const res = await setSoloDisposition(session.id, next);
    setSavingDisp(false);
    if (res.ok && res.disposition) setDisposition(res.disposition);
    void poll();
  };

  const decidedWeeks = data.rulings.length;

  return (
    <div className="fac">
      <header className="fac-head">
        <div className="wm">
          IN<span>COMMAND</span> · SOLO
        </div>
        <span className="fac-scn">{session.scenario}</span>
        <span className={`pill ${session.status}`}>{session.status}</span>
        <span className="cast-badge ai">solo</span>
        <div className="spacer" />
        <Link className="btn ghost" href="/facilitator">
          ← Sessions
        </Link>
        <Link className="btn brief" href={`/facilitator/debrief/${session.id}`}>
          Debrief
        </Link>
      </header>

      <div className="fac-grid">
        {/* Run + casting */}
        <section className="fac-col">
          <h2>The run</h2>
          <div className="solo-fac-run">
            <div className="sfr-line">
              <span className="db-role">Progress</span>
              <span>
                {decidedWeeks}
                {data.weekCount ? ` / ${data.weekCount}` : ''} weeks decided
              </span>
            </div>

            <div className="sfr-disp">
              <div className="db-role">Disposition (run dial)</div>
              <div className="sfr-disp-opts">
                {data.dispositions.map((d) => (
                  <button
                    key={d.key}
                    className={`btn ${disposition === d.key ? 'primary' : 'ghost'}`}
                    disabled={savingDisp}
                    onClick={() => changeDisposition(d.key)}
                    title={d.tag ?? ''}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="db-role" style={{ marginTop: 14 }}>
              World model
            </div>
            <div className="sfr-drivers">
              {data.drivers.map((dr) => {
                const pct = Math.max(0, Math.min(100, Math.round(dr.value)));
                const col = pct < 25 ? 'var(--danger)' : pct < 50 ? 'var(--warn)' : 'var(--online)';
                return (
                  <div className="sfr-driver" key={dr.key}>
                    <div className="sfr-driver-top">
                      <span>{dr.label}</span>
                      <span className="sfr-val">{Math.round(dr.value)}</span>
                    </div>
                    <div className="sfr-bar">
                      <span style={{ width: `${pct}%`, background: col }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <h2 style={{ marginTop: 22 }}>Seats</h2>
          <div className="fac-roster">
            {data.ceo ? (
              <div className="fac-seat">
                <span className={`dot${data.ceo.present ? ' online' : ''}`} />
                <div className="fac-seat-main">
                  <div className="fac-seat-name">
                    {data.ceo.name}
                    <span className="cast-badge human">CEO · human</span>
                  </div>
                  <div className="db-role">the hot seat</div>
                </div>
              </div>
            ) : null}
            {data.advisors.map((a) => (
              <div className="fac-seat" key={a.seatKey}>
                <span className="dot" />
                <div className="fac-seat-main">
                  <div className="fac-seat-name">
                    {a.name}
                    <span className={`cast-badge ${a.castKind}`}>{a.castKind === 'ai' ? 'AI' : 'human'}</span>
                  </div>
                  <div className="db-role">{a.role}</div>
                </div>
                <AdvisorCast sessionId={session.id} seatKey={a.seatKey} name={a.name} kind={a.castKind} />
              </div>
            ))}
          </div>
        </section>

        {/* Ruling trail */}
        <section className="fac-col">
          <h2>Ruling trail</h2>
          {data.rulings.length === 0 ? (
            <div className="db-dim">No decisions ruled yet.</div>
          ) : (
            <div className="sfr-rulings">
              {data.rulings.map((r, i) => (
                <div className="sfr-ruling" key={i}>
                  <div className="sfr-ruling-top">
                    <span className="tag">Week {r.weekIdx}</span>
                    {r.branch ? <span className="tag trig">branch: {r.branch}</span> : null}
                    {r.buzzer ? <span className="tag kind-alert">buzzer</span> : null}
                  </div>
                  {r.decision ? <div className="sfr-ruling-dec">“{r.decision}”</div> : null}
                  <div className="sfr-dims">
                    {Object.entries(r.dims).map(([k, v]) => (
                      <span key={k} className={`sfr-dim ${v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>
                        {k} {v > 0 ? '+' : ''}
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live feed */}
        <section className="fac-col">
          <h2>Live feed</h2>
          <div className="fac-feed">
            {feed.length === 0 ? (
              <div className="db-dim">No events yet.</div>
            ) : (
              feed.map((e) => (
                <div className={`fac-ev${e.derived ? ' derived' : ''}`} key={e.id}>
                  <span className="db-t">{formatTime(e.at)}</span>
                  {e.seat ? <span className="fac-ev-seat">{e.seat}</span> : null}
                  <span className="db-type">{e.type}</span>
                  {e.target ? <span className="db-target">→ {e.target}</span> : null}
                  {e.preview ? <span className="db-preview">“{e.preview}”</span> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AdvisorCast({ sessionId, seatKey, name, kind }: { sessionId: string; seatKey: string; name: string; kind: 'human' | 'ai' }) {
  const [cur, setCur] = useState(kind);
  const [busy, setBusy] = useState(false);
  const flip = async () => {
    const next = cur === 'ai' ? 'human' : 'ai';
    if (next === 'human' && !confirm(`Make ${name} a human seat? The advisor stops being engine-driven.`)) return;
    setBusy(true);
    const res = await castSeat({ sessionId, seatKey, kind: next });
    setBusy(false);
    if (res.ok && res.castKind) setCur(res.castKind);
  };
  return (
    <button className="btn ghost" disabled={busy} onClick={flip} title="Cast this advisor human or AI">
      {busy ? '…' : cur === 'ai' ? 'Make human' : 'Cast AI'}
    </button>
  );
}
