'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParticipantChannel } from '@/lib/realtime';
import { logEvent } from '@/lib/actions';
import { soloAsk, soloDecide } from '@/lib/solo-actions';
import type { Ruling } from '@/lib/solo-referee';
import { initials as ini, colorFrom } from '@/lib/ui';
import type { SoloBundle } from '@/lib/solo-data';

// Phase 3 clock + Phase 4 heart: pull-to-ask (advisor replies + held-info reveal) and
// the free-text decision ruled by the AI referee. No week-advance flow beyond a link
// yet; the game-film debrief is Phase 5.
type Released = { key: string; releaseDay: number; from: string | null; text: string; kind: 'feed' | 'surprise' | 'pulse'; title?: string | null; day?: number | null };
interface Ask { id: string; advisorKey: string; question: string; reply: string; hold: { surfaced: boolean; hedged: boolean; text: string } | null }

export function SoloApp({ bundle }: { bundle: SoloBundle }) {
  const { config, week } = bundle;
  const auth = { sessionId: bundle.sessionId, participantId: bundle.participantId, token: bundle.token };
  const weekSeconds = week.seconds || config.weekSeconds;
  const dayMs = (weekSeconds * 1000) / config.days;
  useParticipantChannel({ sessionId: bundle.sessionId, seatKey: bundle.seatKey, enabled: true });

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [buzzer, setBuzzer] = useState(false);
  const [extraDays, setExtraDays] = useState(0);
  const [reprieves, setReprieves] = useState(0);
  const [drivers, setDrivers] = useState<Record<string, number>>(() => Object.fromEntries(bundle.drivers.map((d) => [d.key, d.val])));
  const [asks, setAsks] = useState<Ask[]>([]);
  const [asking, setAsking] = useState<string | null>(null);
  const [askText, setAskText] = useState('');
  const [askBusy, setAskBusy] = useState(false);
  const [decisionText, setDecisionText] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [ruling, setRuling] = useState<Ruling | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const totalDays = config.days + extraDays;
  const weekDurationMs = totalDays * dayMs;
  const curDay = Math.min(totalDays, Math.floor(elapsed / dayMs) + 1);
  const daysLeft = totalDays - elapsed / dayMs;
  const secLeft = Math.max(0, Math.ceil((weekDurationMs - elapsed) / 1000));
  const low = daysLeft <= config.lowTimeDays;
  const canReprieve = reprieves < 2;
  const decided = ruling !== null;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 200), 200);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (!buzzer && running && !decided && elapsed >= weekDurationMs) {
      setBuzzer(true);
      setRunning(false);
      void logEvent({ ...auth, type: 'week_timeout', channel: 'system', target: `week-${week.n}` });
    }
  }, [elapsed, weekDurationMs, buzzer, running, decided]);
  useEffect(() => {
    void logEvent({ ...auth, type: 'week_started', channel: 'system', target: `week-${week.n}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeline = useMemo<Released[]>(() => {
    const items: Released[] = [];
    week.feed.forEach((f, i) => {
      const rd = Math.min(totalDays, (f.day ?? 1) + (bundle.disposition === 'guarded' ? 1 : 0));
      items.push({ key: `f${i}`, releaseDay: rd, from: f.from, text: f.text, kind: 'feed', day: f.day });
    });
    week.surprises.forEach((s, i) => items.push({ key: `s${i}`, releaseDay: s.day, from: s.from, text: s.text, kind: 'surprise', title: s.title, day: s.day }));
    if (week.pulse) items.push({ key: 'pulse', releaseDay: 3, from: week.pulse.from, text: week.pulse.text, kind: 'pulse' });
    return items.filter((it) => it.releaseDay <= curDay).sort((a, b) => a.releaseDay - b.releaseDay);
  }, [curDay, totalDays, week, bundle.disposition]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [timeline.length, asks.length]);

  const castByKey = useMemo(() => new Map(bundle.cast.map((c) => [c.seatKey, c])), [bundle.cast]);

  const takeReprieve = () => {
    if (!canReprieve) return;
    setExtraDays((d) => d + config.extraDaysPerReprieve);
    setReprieves((r) => r + 1);
    setDrivers((prev) => {
      const next = { ...prev };
      for (const [k, delta] of Object.entries(bundle.reprieveCost)) next[k] = (next[k] ?? 0) + delta;
      return next;
    });
    if (buzzer) { setBuzzer(false); setRunning(true); }
    void logEvent({ ...auth, type: 'reprieve_taken', channel: 'system', target: `week-${week.n}`, payload: { reprieves: reprieves + 1 } });
  };

  const sendAsk = async (advisorKey: string) => {
    const q = askText.trim();
    if (!q || askBusy) return;
    setAskBusy(true);
    const res = await soloAsk({ ...auth, advisorKey, weekIdx: bundle.weekIdx, question: q });
    setAskBusy(false);
    if (res.ok) {
      setAsks((a) => [...a, { id: crypto.randomUUID(), advisorKey, question: q, reply: res.reply ?? '', hold: res.hold ?? null }]);
      setAskText('');
      setAsking(null);
    }
  };

  const submitDecision = async () => {
    const text = decisionText.trim();
    if (text.length < 8 || deciding) return;
    setDeciding(true);
    setRunning(false);
    const res = await soloDecide({ ...auth, weekIdx: bundle.weekIdx, decisionText: text, drivers, reprieves, underBuzzer: buzzer, decidedDay: curDay });
    setDeciding(false);
    if (res.ok && res.ruling) {
      setRuling(res.ruling);
      if (res.drivers) setDrivers(res.drivers);
      setBuzzer(false);
    }
  };

  const mm = Math.floor(secLeft / 60);
  const ss = String(secLeft % 60).padStart(2, '0');
  const lastWeek = week.n >= bundle.weekCount;

  return (
    <div className="solo">
      <header className="solo-head">
        <div className="solo-logo">{bundle.company.logo ?? bundle.company.name?.[0] ?? 'B'}</div>
        <div className="solo-co">
          <div className="solo-co-name">{bundle.company.name}</div>
          {bundle.company.sub ? <div className="solo-co-sub">{bundle.company.sub}</div> : null}
        </div>
        <div className="solo-week">
          <div className="solo-week-title">Week {week.n}: {week.title}</div>
          <div className="solo-week-of">Week {week.n} of {bundle.weekCount}</div>
        </div>
        <div className="spacer" />
        {!decided ? (
          <div className={`solo-clock${buzzer ? ' buzzer' : low ? ' low' : ''}`}>
            <div className="sc-row">
              <span className="sc-day">Day {curDay}<small>/{totalDays}</small></span>
              <span className="sc-time">{buzzer ? "⏰ time's up" : `${mm}:${ss} left`}</span>
            </div>
            <div className="sc-bar"><span style={{ width: `${buzzer ? 0 : Math.max(0, (daysLeft / totalDays) * 100)}%` }} /></div>
          </div>
        ) : null}
      </header>

      {!decided ? (
        <div className="solo-days">
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            return <span key={i} className={`day-dot ${day < curDay ? 'past' : day === curDay ? 'now' : ''}`} />;
          })}
        </div>
      ) : null}

      <div className="solo-hud">
        {bundle.drivers.map((d) => {
          const val = drivers[d.key] ?? d.val;
          const pct = Math.round(((val - d.min) / Math.max(1, d.max - d.min)) * 100);
          const col = pct < 25 ? 'var(--danger)' : pct < 50 ? 'var(--warn)' : 'var(--online)';
          return (
            <div className="hud-driver" key={d.key}>
              <div className="hud-top"><span className="hud-label">{d.label}</span><span className="hud-val">{Math.round(val)}</span></div>
              <div className="hud-bar"><span style={{ width: `${pct}%`, background: col }} /></div>
            </div>
          );
        })}
      </div>

      <div className="solo-body">
        <main className="solo-main">
          <section className="solo-panel">
            <h2>The situation</h2>
            <p className="solo-situation">{week.situation}</p>
          </section>

          {Object.keys(week.advocacy).length ? (
            <section className="solo-panel">
              <h2>Your team’s read</h2>
              <div className="solo-advocacy">
                {Object.entries(week.advocacy).map(([key, text]) => {
                  const c = castByKey.get(key);
                  return (
                    <div className="adv" key={key}>
                      <span className="c-av" style={{ background: c?.color ?? colorFrom(key) }}>{c?.initials ?? ini(c?.name ?? key)}</span>
                      <div className="adv-main">
                        <div className="adv-who">{c?.name ?? key} <span className="adv-role">{c?.short ?? c?.role}</span></div>
                        <div className="adv-text">{text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="solo-panel">
            <h2>Inbox — the week is running</h2>
            <div className="solo-feed" ref={feedRef}>
              {timeline.map((it) => {
                const c = it.from ? castByKey.get(it.from) : null;
                return (
                  <div className={`feed-item2 ${it.kind}`} key={it.key}>
                    <span className="c-av" style={{ background: c?.color ?? colorFrom(it.from ?? 'x') }}>{c?.initials ?? ini(c?.name ?? it.from ?? '•')}</span>
                    <div className="fi-main">
                      <div className="fi-top">
                        <span className="fi-who">{it.title ? it.title : c?.name ?? it.from}</span>
                        {it.day ? <span className="fi-day">Day {it.day}</span> : null}
                        {it.kind !== 'feed' ? <span className={`fi-tag ${it.kind}`}>{it.kind}</span> : null}
                      </div>
                      <div className="fi-text">{it.text}</div>
                    </div>
                  </div>
                );
              })}
              {/* pull-to-ask exchanges */}
              {asks.map((a) => {
                const c = castByKey.get(a.advisorKey);
                return (
                  <div key={a.id} className="ask-exchange">
                    <div className="ask-you">You → {c?.name ?? a.advisorKey}: “{a.question}”</div>
                    <div className="feed-item2">
                      <span className="c-av" style={{ background: c?.color ?? colorFrom(a.advisorKey) }}>{c?.initials ?? ini(c?.name ?? a.advisorKey)}</span>
                      <div className="fi-main">
                        <div className="fi-top"><span className="fi-who">{c?.name ?? a.advisorKey}</span></div>
                        <div className="fi-text">{a.reply}</div>
                      </div>
                    </div>
                    {a.hold ? (
                      <div className={`feed-item2 ${a.hold.surfaced ? 'reveal' : 'pulse'}`}>
                        <span className="c-av" style={{ background: c?.color ?? colorFrom(a.advisorKey) }}>{c?.initials ?? ini(c?.name ?? a.advisorKey)}</span>
                        <div className="fi-main">
                          <div className="fi-top"><span className="fi-who">{a.hold.surfaced ? 'Now it comes out' : 'They hold something back'}</span></div>
                          <div className="fi-text">{a.hold.text}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* decision / ruling */}
          {decided && ruling ? (
            <section className="solo-panel ruling">
              <h2>The week resolves</h2>
              <p className="solo-situation">{ruling.narrative}</p>
              <div className="ruling-deltas">
                {bundle.drivers.map((d) => {
                  const dl = ruling.deltas[d.key] ?? 0;
                  return (
                    <span key={d.key} className={`delta ${dl > 0 ? 'up' : dl < 0 ? 'down' : ''}`}>
                      {d.label} {dl > 0 ? '+' : ''}{dl}
                    </span>
                  );
                })}
              </div>
              <div className="ruling-reacts">
                {ruling.teamReactions.map((r, i) => {
                  const c = castByKey.get(r.who);
                  return (
                    <div className="adv" key={i}>
                      <span className="c-av" style={{ background: c?.color ?? colorFrom(r.who) }}>{c?.initials ?? ini(c?.name ?? r.who)}</span>
                      <div className="adv-main"><div className="adv-who">{c?.name ?? r.who}</div><div className="adv-text">{r.text}</div></div>
                    </div>
                  );
                })}
              </div>
              <div className="dec-actions">
                {lastWeek ? (
                  <span className="db-dim">Final week decided. The game-film debrief is the next phase.</span>
                ) : (
                  <Link className="btn primary" href={`/solo/${bundle.sessionId}?t=${encodeURIComponent(bundle.token)}&week=${week.n + 1}`}>
                    Continue to Week {week.n + 1} →
                  </Link>
                )}
              </div>
            </section>
          ) : (
            <section className={`solo-decision${buzzer ? ' buzzed' : low ? ' low' : ''}`}>
              <div className="dec-banner">
                {buzzer ? '⏰ The week ran out — make your call now, even briefly.' : low ? 'Time is short — decide, or buy more time.' : 'Write your call in your own words. Decide early and time jumps ahead; let it run out and the crowd fills the silence.'}
              </div>
              <textarea
                className="dec-input"
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="This week I'm deciding to…"
                disabled={deciding}
              />
              <div className="dec-actions">
                <button className="btn primary" disabled={deciding || decisionText.trim().length < 8} onClick={submitDecision}>
                  {deciding ? 'The referee is ruling…' : 'Send your decision'}
                </button>
                <button className="btn ghost" onClick={takeReprieve} disabled={!canReprieve}>
                  {canReprieve ? `Need more time (+${config.extraDaysPerReprieve}d, costs you)` : 'No more time to buy'}
                </button>
              </div>
            </section>
          )}
        </main>

        <aside className="solo-rail">
          <h3>Your team — reach out</h3>
          {bundle.cast.map((c) => (
            <div className="rail-member" key={c.seatKey}>
              <span className="c-av" style={{ background: c.color ?? colorFrom(c.seatKey) }}>{c.initials ?? ini(c.name)}</span>
              <div className="rail-main">
                <div className="rail-name">{c.name}</div>
                <div className="rail-role">{c.short ?? c.role}</div>
                {asking === c.seatKey ? (
                  <div className="ask-box">
                    <textarea value={askText} onChange={(e) => setAskText(e.target.value)} placeholder={`Ask ${c.name.split(' ')[0]}…`} autoFocus />
                    <div className="ask-actions">
                      <button className="btn primary" disabled={askBusy || !askText.trim()} onClick={() => sendAsk(c.seatKey)}>{askBusy ? '…' : 'Ask'}</button>
                      <button className="btn ghost" onClick={() => { setAsking(null); setAskText(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="rail-ask" disabled={decided} onClick={() => { setAsking(c.seatKey); setAskText(''); }}>Reach out ↗</button>
                )}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
