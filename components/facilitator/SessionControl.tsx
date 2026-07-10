'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  castSeat,
  fireInjectFac,
  finalizeFac,
  recentEvents,
  sendAsNpc,
  type FeedEvent,
  type InjectRow,
  type RosterRow,
} from '@/lib/facilitator-actions';
import { formatTime } from '@/lib/ui';

export function SessionControl({
  session,
  roster,
  injects,
}: {
  session: { id: string; status: string; scenario: string };
  roster: RosterRow[];
  injects: InjectRow[];
}) {
  const [status, setStatus] = useState(session.status);
  const [firing, setFiring] = useState<string | null>(null);
  const [fireMsg, setFireMsg] = useState<string>('');
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  // Live event feed — poll (Realtime broadcast is per-seat; the facilitator reads
  // the authoritative log server-side).
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

  const fire = async (inj: InjectRow) => {
    setFiring(inj.id);
    setFireMsg('');
    const res = await fireInjectFac(session.id, inj.id, false);
    setFiring(null);
    setFireMsg(
      res?.fired
        ? `Fired ${inj.kind}${inj.seat ? ` → ${inj.seat}` : ''} (${res.delivered} delivered)`
        : `Not fired: ${res?.reason ?? 'unknown'}${res?.reason === 'cancelled' ? ' (reply defused it — use Force)' : ''}`,
    );
    void poll();
  };

  const forceFire = async (inj: InjectRow) => {
    setFiring(inj.id);
    const res = await fireInjectFac(session.id, inj.id, true);
    setFiring(null);
    setFireMsg(res?.fired ? `Force-fired ${inj.kind}${inj.seat ? ` → ${inj.seat}` : ''}` : `Not fired: ${res?.reason}`);
    void poll();
  };

  const finalize = async () => {
    if (!confirm('End this session and generate the debrief snapshot?')) return;
    const res = await finalizeFac(session.id);
    if (res?.ok) setStatus('ended');
    setFireMsg(res?.ok ? `Session finalized · ${res.omissions ?? 0} omissions · ${res.scored ?? 0} scores` : 'Finalize failed');
    void poll();
  };

  return (
    <div className="fac">
      <header className="fac-head">
        <div className="wm">
          IN<span>COMMAND</span> · CONTROL
        </div>
        <span className="fac-scn">{session.scenario}</span>
        <span className={`pill ${status}`}>{status}</span>
        <div className="spacer" />
        <Link className="btn ghost" href="/facilitator">
          ← Sessions
        </Link>
        <Link className="btn brief" href={`/facilitator/debrief/${session.id}`}>
          Debrief
        </Link>
        <button className="btn" onClick={finalize} disabled={status === 'ended'}>
          {status === 'ended' ? 'Ended' : 'End session'}
        </button>
      </header>

      {fireMsg ? <div className="fac-flash">{fireMsg}</div> : null}

      <div className="fac-grid">
        {/* Roster + hand-drive */}
        <section className="fac-col">
          <h2>Seats</h2>
          <div className="fac-roster">
            {roster.map((r) => (
              <div className="fac-seat" key={r.participantId}>
                <span className={`dot${r.present ? ' online' : ''}`} />
                <div className="fac-seat-main">
                  <div className="fac-seat-name">
                    {r.name}
                    {r.castKind === 'ai' ? <span className="cast-badge ai">AI</span> : null}
                  </div>
                  <div className="db-role">{r.role}</div>
                </div>
                <CastToggle sessionId={session.id} seat={r} />
                <HandDrive sessionId={session.id} seat={r} disabled={status !== 'live'} />
              </div>
            ))}
          </div>
        </section>

        {/* Injects */}
        <section className="fac-col">
          <h2>Injects ({injects.length})</h2>
          <div className="fac-injects">
            {injects.map((i) => (
              <div className="fac-inject" key={i.id}>
                <div className="fac-inject-top">
                  <span className={`tag kind-${i.kind}`}>{i.kind}</span>
                  {i.seat ? <span className="fac-inject-seat">{i.seat}</span> : <span className="fac-inject-seat">all</span>}
                  {i.delay_min != null ? <span className="db-role">T+{i.delay_min}</span> : null}
                  {i.trigger ? <span className="tag trig">trigger {i.trigger}</span> : null}
                </div>
                {i.preview ? <div className="fac-inject-prev">{i.preview}</div> : null}
                {i.cond ? <div className="fac-inject-cond">if: {i.cond}</div> : null}
                <div className="fac-inject-actions">
                  <button className="btn primary" disabled={firing === i.id || status !== 'live'} onClick={() => fire(i)}>
                    {firing === i.id ? '…' : 'Fire'}
                  </button>
                  {i.cond ? (
                    <button className="btn ghost" disabled={firing === i.id || status !== 'live'} onClick={() => forceFire(i)}>
                      Force
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
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

function CastToggle({ sessionId, seat }: { sessionId: string; seat: RosterRow }) {
  const [kind, setKind] = useState<'human' | 'ai'>(seat.castKind);
  const [busy, setBusy] = useState(false);
  const flip = async () => {
    const next = kind === 'ai' ? 'human' : 'ai';
    if (next === 'ai' && !confirm(`Cast ${seat.name} as AI? Their magic-link is removed and the seat is driven by the engine.`)) return;
    setBusy(true);
    const res = await castSeat({ sessionId, seatKey: seat.seatKey, kind: next });
    setBusy(false);
    if (res.ok && res.castKind) setKind(res.castKind);
  };
  return (
    <button className="btn ghost" disabled={busy} onClick={flip} title="Cast this seat human or AI">
      {busy ? '…' : kind === 'ai' ? 'Make human' : 'Cast AI'}
    </button>
  );
}

function HandDrive({ sessionId, seat, disabled }: { sessionId: string; seat: RosterRow; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [contactKey, setContactKey] = useState(seat.callableContacts[0]?.key ?? '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  if (seat.callableContacts.length === 0) return null;
  if (!open) {
    return (
      <button className="btn ghost" disabled={disabled} onClick={() => setOpen(true)} title="Hand-drive an NPC to this seat">
        Drive NPC
      </button>
    );
  }
  return (
    <div className="fac-drive">
      <select value={contactKey} onChange={(e) => setContactKey(e.target.value)}>
        {seat.callableContacts.map((c) => (
          <option key={c.key} value={c.key}>
            {c.full}
          </option>
        ))}
      </select>
      <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`As ${contactKey} → ${seat.name}…`} />
      <div className="fac-drive-actions">
        <button
          className="btn primary"
          disabled={sending || !body.trim()}
          onClick={async () => {
            setSending(true);
            const res = await sendAsNpc({ sessionId, seatKey: seat.seatKey, contactKey, body });
            setSending(false);
            if (res.ok) {
              setBody('');
              setOpen(false);
            }
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
        <button className="btn ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
