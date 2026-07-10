'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParticipantChannel } from '@/lib/realtime';
import { logEvent } from '@/lib/actions';
import { initials as ini, colorFrom } from '@/lib/ui';
import type { SoloBundle } from '@/lib/solo-data';

// Phase 3 — the real-time clock + feed trickle + buzzer + "need more time".
// Faithful to crisis-engine.js: a 200ms tick maps real seconds → in-fiction days;
// feed/surprises/pulse release as their day arrives (guarded disposition delays feed
// by a day); at totalDays·dayMs the buzzer forces the call; reprieve buys days at a
// driver cost. No AI yet — writing the call + referee ruling is Phase 4.
type Released = { key: string; releaseDay: number; from: string | null; text: string; kind: 'feed' | 'surprise' | 'pulse'; title?: string | null; day?: number | null };

export function SoloApp({ bundle }: { bundle: SoloBundle }) {
  const { config, week } = bundle;
  const weekSeconds = week.seconds || config.weekSeconds;
  const dayMs = (weekSeconds * 1000) / config.days;

  const { connected } = useParticipantChannel({ sessionId: bundle.sessionId, seatKey: bundle.seatKey, enabled: true });

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [buzzer, setBuzzer] = useState(false);
  const [extraDays, setExtraDays] = useState(0);
  const [reprieves, setReprieves] = useState(0);
  const [drivers, setDrivers] = useState<Record<string, number>>(() => Object.fromEntries(bundle.drivers.map((d) => [d.key, d.val])));
  const feedRef = useRef<HTMLDivElement>(null);

  const totalDays = config.days + extraDays;
  const weekDurationMs = totalDays * dayMs;
  const curDay = Math.min(totalDays, Math.floor(elapsed / dayMs) + 1);
  const daysLeft = totalDays - elapsed / dayMs;
  const secLeft = Math.max(0, Math.ceil((weekDurationMs - elapsed) / 1000));
  const low = daysLeft <= config.lowTimeDays;
  const canReprieve = reprieves < 2;

  // clock tick
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 200), 200);
    return () => clearInterval(t);
  }, [running]);

  // buzzer at week end
  useEffect(() => {
    if (!buzzer && running && elapsed >= weekDurationMs) {
      setBuzzer(true);
      setRunning(false);
      void logEvent({ sessionId: bundle.sessionId, participantId: bundle.participantId, type: 'week_timeout', channel: 'system', target: `week-${week.n}` });
    }
  }, [elapsed, weekDurationMs, buzzer, running]);

  // week_started once
  useEffect(() => {
    void logEvent({ sessionId: bundle.sessionId, participantId: bundle.participantId, type: 'week_started', channel: 'system', target: `week-${week.n}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // released timeline (derived from curDay) — feed (guarded delay), surprises, pulse
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
  }, [timeline.length]);

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
    if (buzzer) {
      setBuzzer(false);
      setRunning(true);
    }
    void logEvent({ sessionId: bundle.sessionId, participantId: bundle.participantId, type: 'reprieve_taken', channel: 'system', target: `week-${week.n}`, payload: { reprieves: reprieves + 1 } });
  };

  const mm = Math.floor(secLeft / 60);
  const ss = String(secLeft % 60).padStart(2, '0');

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
        {/* countdown clock */}
        <div className={`solo-clock${buzzer ? ' buzzer' : low ? ' low' : ''}`}>
          <div className="sc-row">
            <span className="sc-day">Day {curDay}<small>/{totalDays}</small></span>
            <span className="sc-time">{buzzer ? "⏰ time's up" : `${mm}:${ss} left`}</span>
          </div>
          <div className="sc-bar"><span style={{ width: `${buzzer ? 0 : Math.max(0, (daysLeft / totalDays) * 100)}%` }} /></div>
        </div>
        <div className="statusline" title={connected ? 'Live' : 'Reconnecting…'}>
          <span className={connected ? 'live' : 'off'} />
        </div>
      </header>

      {/* day dots */}
      <div className="solo-days">
        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1;
          return <span key={i} className={`day-dot ${day < curDay ? 'past' : day === curDay ? 'now' : ''}`} />;
        })}
      </div>

      {/* Driver HUD */}
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
              {timeline.length === 0 ? (
                <div className="db-dim">Your team will bring you things as the days pass…</div>
              ) : (
                timeline.map((it) => {
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
                })
              )}
            </div>
          </section>

          {/* decision zone — buzzer + reprieve. Writing the call + AI ruling is Phase 4. */}
          <section className={`solo-decision${buzzer ? ' buzzed' : low ? ' low' : ''}`}>
            {buzzer ? (
              <div className="dec-banner">⏰ The week ran out — the board wants your call now. (Writing the decision + the AI referee ruling arrives in the next phase.)</div>
            ) : low ? (
              <div className="dec-banner">Time is short — decide, or buy more time.</div>
            ) : (
              <div className="dec-banner muted">Decide early and time jumps ahead; let it run out and the crowd fills the silence. (Decision compose: next phase.)</div>
            )}
            <div className="dec-actions">
              <button className="btn" disabled title="Writing your call lands in Phase 4">Write your call…</button>
              <button className="btn ghost" onClick={takeReprieve} disabled={!canReprieve}>
                {canReprieve ? `Need more time (+${config.extraDaysPerReprieve}d, costs you)` : 'No more time to buy'}
              </button>
            </div>
          </section>
        </main>

        <aside className="solo-rail">
          <h3>Your team</h3>
          {bundle.cast.map((c) => (
            <div className="rail-member" key={c.seatKey}>
              <span className="c-av" style={{ background: c.color ?? colorFrom(c.seatKey) }}>{c.initials ?? ini(c.name)}</span>
              <div className="rail-main">
                <div className="rail-name">{c.name}</div>
                <div className="rail-role">{c.short ?? c.role}</div>
              </div>
            </div>
          ))}
          <div className="rail-note">Reaching out to ask — and holding info until you do — is Phase 4.</div>
        </aside>
      </div>
    </div>
  );
}
