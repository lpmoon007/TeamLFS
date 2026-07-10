'use client';
import { useParticipantChannel } from '@/lib/realtime';
import { initials as ini, colorFrom } from '@/lib/ui';
import type { SoloBundle } from '@/lib/solo-data';

// Phase 2 — static solo read path. Renders one Backlash week from the DB: the driver
// HUD, the situation, the advisors' opening positions, the trickled feed, and the
// cast rail. Realtime is wired (connection dot) for the live trickle in Phase 3; the
// clock, pull-to-ask, and AI referee are Phases 3-4.
export function SoloApp({ bundle }: { bundle: SoloBundle }) {
  const { connected } = useParticipantChannel({
    sessionId: bundle.sessionId,
    seatKey: bundle.seatKey,
    enabled: true,
  });
  const castByKey = new Map(bundle.cast.map((c) => [c.seatKey, c]));

  return (
    <div className="solo">
      <header className="solo-head">
        <div className="solo-logo">{bundle.company.logo ?? bundle.company.name?.[0] ?? 'B'}</div>
        <div className="solo-co">
          <div className="solo-co-name">{bundle.company.name}</div>
          {bundle.company.sub ? <div className="solo-co-sub">{bundle.company.sub}</div> : null}
        </div>
        <div className="solo-week">
          <div className="solo-week-title">
            Week {bundle.week.n}: {bundle.week.title}
          </div>
          <div className="solo-week-of">
            Week {bundle.week.n} of {bundle.weekCount}
          </div>
        </div>
        <div className="spacer" />
        <div className="statusline" title={connected ? 'Live' : 'Reconnecting…'}>
          <span className={connected ? 'live' : 'off'} /> {connected ? 'Live' : 'Offline'}
        </div>
      </header>

      {/* Driver HUD */}
      <div className="solo-hud">
        {bundle.drivers.map((d) => {
          const pct = Math.round(((d.val - d.min) / Math.max(1, d.max - d.min)) * 100);
          return (
            <div className="hud-driver" key={d.key}>
              <div className="hud-top">
                <span className="hud-label">{d.label}</span>
                <span className="hud-val">{Math.round(d.val)}</span>
              </div>
              <div className="hud-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="solo-body">
        <main className="solo-main">
          <section className="solo-panel">
            <h2>The situation</h2>
            <p className="solo-situation">{bundle.week.situation}</p>
          </section>

          {Object.keys(bundle.week.advocacy).length ? (
            <section className="solo-panel">
              <h2>Your team’s read</h2>
              <div className="solo-advocacy">
                {Object.entries(bundle.week.advocacy).map(([key, text]) => {
                  const c = castByKey.get(key);
                  const color = c?.color ?? colorFrom(key);
                  return (
                    <div className="adv" key={key}>
                      <span className="c-av" style={{ background: color }}>
                        {c?.initials ?? ini(c?.name ?? key)}
                      </span>
                      <div className="adv-main">
                        <div className="adv-who">
                          {c?.name ?? key} <span className="adv-role">{c?.short ?? c?.role}</span>
                        </div>
                        <div className="adv-text">{text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="solo-panel">
            <h2>Inbox — this week</h2>
            <p className="db-sub">The week trickles in across the days. (Live pacing + reaching out to ask lands in the next phase.)</p>
            <div className="solo-feed">
              {bundle.week.feed.length === 0 ? (
                <div className="db-dim">No items.</div>
              ) : (
                bundle.week.feed.map((f, i) => {
                  const c = castByKey.get(f.from);
                  const color = c?.color ?? colorFrom(f.from);
                  return (
                    <div className="feed-item2" key={i}>
                      <span className="c-av" style={{ background: color }}>
                        {c?.initials ?? ini(c?.name ?? f.from)}
                      </span>
                      <div className="fi-main">
                        <div className="fi-top">
                          <span className="fi-who">{c?.name ?? f.from}</span>
                          {f.day ? <span className="fi-day">Day {f.day}</span> : null}
                        </div>
                        <div className="fi-text">{f.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {bundle.week.wire.length ? (
            <section className="solo-panel">
              <h2>The wire</h2>
              <ul className="solo-wire">
                {bundle.week.wire.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>

        {/* Cast rail — the advisors the CEO can reach out to (Phase 4) */}
        <aside className="solo-rail">
          <h3>Your team</h3>
          {bundle.cast.map((c) => (
            <div className="rail-member" key={c.seatKey}>
              <span className="c-av" style={{ background: c.color ?? colorFrom(c.seatKey) }}>
                {c.initials ?? ini(c.name)}
              </span>
              <div className="rail-main">
                <div className="rail-name">{c.name}</div>
                <div className="rail-role">{c.short ?? c.role}</div>
                {c.priority ? <div className="rail-priority">{c.priority}</div> : null}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
