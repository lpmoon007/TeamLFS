'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParticipantChannel, useRoomChannel } from '@/lib/realtime';
import { logEvent } from '@/lib/actions';
import { soloAsk, soloDecide, setRunDisposition, soloTeamDecide, soloSurfaceHold } from '@/lib/solo-actions';
import { getDecisionBoard, postProposal, postStance } from '@/lib/deliberation';
import type { DecisionBoard, Valence } from '@/lib/deliberation-types';
import type { Ruling } from '@/lib/solo-referee';
import { initials as ini, colorFrom } from '@/lib/ui';
import type { SoloBundle } from '@/lib/solo-data';

// Solo cockpit — re-skinned to the validated prototype visual layer (soloengine.css):
// intro + disposition pick, sticky HUD + hudclock, meters, the week feed that TRICKLES
// across days, the reach-out compose modal, and the fixed decision dock. All the engine
// logic (clock, drip, pull-to-ask, referee ruling) is unchanged.

type Kind = 'advocacy' | 'feed' | 'surprise' | 'pulse';
type Released = { key: string; releaseDay: number; from: string | null; text: string; kind: Kind; title?: string | null; day?: number | null };
interface Ask { id: string; advisorKey: string; question: string; reply: string; hold: { surfaced: boolean; hedged: boolean; text: string } | null }

const DISPOSITIONS: { key: string; label: string; tag: string; cap: string }[] = [
  { key: 'served', label: 'Forthcoming', tag: 'trust earned', cap: 'Your team pushes you what you need, on time — including the hard news. This is the team you earn by having listened before.' },
  { key: 'request', label: 'On request', tag: 'neutral', cap: 'Routine updates come to you, but the people closest to the danger hold their piece until asked. They answer straight — if you know who to ask.' },
  { key: 'guarded', label: 'Guarded', tag: 'low trust', cap: 'Your team has learned to protect itself around you. Critical items are held, and even when asked, they hedge the first time. You have to press.' },
  { key: 'surprise', label: 'Surprise', tag: 'undisclosed', cap: 'You will not be told which team you walked in with. Read them as you go.' },
];

export function SoloApp({ bundle }: { bundle: SoloBundle }) {
  const { config, week } = bundle;
  const auth = { sessionId: bundle.sessionId, participantId: bundle.participantId, token: bundle.token };
  const weekSeconds = week.seconds || config.weekSeconds;
  const dayMs = (weekSeconds * 1000) / config.days;
  // solo is single-player — no cross-seat concern; keep the (self-only) subscription.
  useParticipantChannel({ sessionId: bundle.sessionId, channelKey: bundle.seatKey, enabled: true });

  // Intro only on the first week; later weeks come straight into the cockpit.
  const [phase, setPhase] = useState<'intro' | 'run'>(bundle.weekIdx === 0 ? 'intro' : 'run');
  const [disp, setDisp] = useState(() => (DISPOSITIONS.some((d) => d.key === bundle.disposition) ? bundle.disposition : 'request'));

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
  const [notice, setNotice] = useState<string | null>(null);
  const [askErr, setAskErr] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // team-cast (Reading 1): the shared Decision Room + surfaced-hold feed.
  const [board, setBoard] = useState<DecisionBoard>({ options: [], lock: null });
  const [surfaced, setSurfaced] = useState<Set<string>>(new Set());
  const [roomSurfaces, setRoomSurfaces] = useState<{ from: string; topic: string | null; text: string; critical: boolean }[]>([]);
  const [propDraft, setPropDraft] = useState('');
  const refreshBoard = () => { if (bundle.teamCast) void getDecisionBoard(bundle.sessionId).then(setBoard); };

  // the solo pages are the light "command" theme; keep the page background light so the
  // dark app theme never peeks on overscroll / short content.
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = '#EEF1F4';
    document.documentElement.style.background = '#EEF1F4';
    return () => { document.body.style.background = prevBody; document.documentElement.style.background = prevHtml; };
  }, []);

  const totalDays = config.days + extraDays;
  const weekDurationMs = totalDays * dayMs;
  const curDay = Math.min(totalDays, Math.floor(elapsed / dayMs) + 1);
  const daysLeft = totalDays - elapsed / dayMs;
  const secLeft = Math.max(0, Math.ceil((weekDurationMs - elapsed) / 1000));
  const low = daysLeft <= config.lowTimeDays;
  const canReprieve = reprieves < 2;
  const decided = ruling !== null;
  const running_ = running && phase === 'run';

  useEffect(() => {
    if (!running_) return;
    const t = setInterval(() => setElapsed((e) => e + 200), 200);
    return () => clearInterval(t);
  }, [running_]);
  useEffect(() => {
    if (phase === 'run' && !buzzer && running && !decided && elapsed >= weekDurationMs) {
      setBuzzer(true);
      setRunning(false);
      void logEvent({ ...auth, type: 'week_timeout', channel: 'system', target: `week-${week.n}` });
    }
  }, [elapsed, weekDurationMs, buzzer, running, decided, phase]);
  useEffect(() => {
    if (phase === 'run') void logEvent({ ...auth, type: 'week_started', channel: 'system', target: `week-${week.n}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const timeline = useMemo<Released[]>(() => {
    const items: Released[] = [];
    // the feed itself is the team's voice trickling in across the week; the situation
    // banner carries the opening context, so nothing dumps at the start.
    week.feed.forEach((f, i) => {
      const rd = Math.min(totalDays, (f.day ?? 1) + (disp === 'guarded' ? 1 : 0));
      items.push({ key: `f${i}`, releaseDay: rd, from: f.from, text: f.text, kind: 'feed', day: f.day });
    });
    week.surprises.forEach((s, i) => items.push({ key: `s${i}`, releaseDay: s.day, from: s.from, text: s.text, kind: 'surprise', title: s.title, day: s.day }));
    if (week.pulse) items.push({ key: 'pulse', releaseDay: 3, from: week.pulse.from, text: week.pulse.text, kind: 'pulse' });
    return items.filter((it) => it.releaseDay <= curDay).sort((a, b) => a.releaseDay - b.releaseDay);
  }, [curDay, totalDays, week, disp]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [timeline.length, asks.length]);

  const castByKey = useMemo(() => new Map(bundle.cast.map((c) => [c.seatKey, c])), [bundle.cast]);

  // team-cast: load the shared board once, and react to room events (proposals/stances/
  // locks → refetch; a teammate surfacing a hold → append; the ruling → transition together).
  useEffect(() => { if (bundle.teamCast && phase === 'run') refreshBoard(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bundle.teamCast, phase]);
  useRoomChannel({
    sessionId: bundle.sessionId,
    roomKey: bundle.roomKey,
    enabled: bundle.teamCast && phase === 'run' && !decided,
    onRoom: (p: any) => {
      if (p?.kind === 'surface') {
        setRoomSurfaces((s) => [...s, { from: p.from, topic: p.topic ?? null, text: p.text ?? '', critical: !!p.critical }]);
      } else if (p?.kind === 'ruled' && p.ruling) {
        setRuling(p.ruling as Ruling);
        if (p.drivers) setDrivers(p.drivers);
        setRunning(false);
        setBuzzer(false);
      } else {
        refreshBoard();
      }
    },
  });

  const propose = async () => {
    const s = propDraft.trim();
    if (!s) return;
    const res = await postProposal({ sessionId: bundle.sessionId, participantId: bundle.participantId, seatId: undefined, seatKey: bundle.seatKey, summary: s });
    if (res.ok) { setPropDraft(''); refreshBoard(); }
  };
  const doStance = async (optionId: string, valence: Valence) => {
    const res = await postStance({ sessionId: bundle.sessionId, participantId: bundle.participantId, seatKey: bundle.seatKey, optionId, valence });
    if (res.ok) refreshBoard();
  };
  const surface = async (topic: string) => {
    setSurfaced((s) => new Set(s).add(topic));
    try { await soloSurfaceHold({ ...auth, weekIdx: bundle.weekIdx, topic }); } catch { /* non-blocking */ }
  };
  const lockAndRule = async (optionId: string) => {
    if (deciding) return;
    setNotice(null);
    setDeciding(true);
    setRunning(false);
    try {
      const res = await soloTeamDecide({ ...auth, weekIdx: bundle.weekIdx, optionId, drivers, reprieves, underBuzzer: buzzer, decidedDay: curDay });
      if (res.ok && res.ruling) {
        setRuling(res.ruling);
        if (res.drivers) setDrivers(res.drivers);
        setBuzzer(false);
      } else {
        setNotice(`The referee couldn’t rule that call${res.reason ? ` (${res.reason})` : ''} — try again.`);
        setRunning(true);
      }
    } catch {
      setNotice('Something went wrong locking the call. Try again.');
      setRunning(true);
    } finally {
      setDeciding(false);
    }
  };

  const takeCommand = async () => {
    if (disp !== bundle.disposition) {
      try { await setRunDisposition({ ...auth, disposition: disp }); } catch { /* non-blocking */ }
    }
    setPhase('run');
  };

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
    setAskErr(null);
    setAskBusy(true);
    const who = castByKey.get(advisorKey)?.name?.split(' ')[0] ?? 'your advisor';
    try {
      const res = await soloAsk({ ...auth, advisorKey, weekIdx: bundle.weekIdx, question: q });
      if (res.ok) {
        setAsks((a) => [...a, { id: crypto.randomUUID(), advisorKey, question: q, reply: res.reply ?? '', hold: res.hold ?? null }]);
        setAskText('');
        setAsking(null); // success closes the modal
      } else {
        setAskErr(`Couldn’t reach ${who}${res.reason ? ` (${res.reason})` : ''}. Try again.`);
      }
    } catch {
      setAskErr(`Something went wrong reaching ${who}. Check the connection and try again.`);
    } finally {
      setAskBusy(false);
    }
  };

  const submitDecision = async () => {
    const text = decisionText.trim();
    if (text.length < 8 || deciding) return;
    setNotice(null);
    setDeciding(true);
    setRunning(false);
    try {
      const res = await soloDecide({ ...auth, weekIdx: bundle.weekIdx, decisionText: text, drivers, reprieves, underBuzzer: buzzer, decidedDay: curDay });
      if (res.ok && res.ruling) {
        setRuling(res.ruling);
        if (res.drivers) setDrivers(res.drivers);
        setBuzzer(false);
      } else {
        setNotice(`The referee couldn’t rule that decision${res.reason ? ` (${res.reason})` : ''} — try again.`);
        setRunning(true);
      }
    } catch {
      setNotice('Something went wrong sending your decision. Try again.');
      setRunning(true);
    } finally {
      setDeciding(false);
    }
  };

  const mm = Math.floor(secLeft / 60);
  const ss = String(secLeft % 60).padStart(2, '0');
  const lastWeek = week.n >= bundle.weekCount;
  const av = (key: string, name?: string | null, cls = 'c-av') => (
    <span className={cls} style={{ background: castByKey.get(key)?.color ?? colorFrom(key) }}>
      {castByKey.get(key)?.initials ?? ini(name ?? castByKey.get(key)?.name ?? key)}
    </span>
  );
  const meterColor = (pct: number) => (pct < 25 ? 'var(--alert)' : pct < 50 ? 'var(--amber)' : 'var(--good)');

  return (
    <div className="soloui">
      <div className="stage">
        <div id="hud">
          <div className="hud">
            <div className="hud-top">
              <div className="co">
                <div className="co-logo">{bundle.company.logo ?? bundle.company.name?.[0] ?? 'H'}</div>
                <div>
                  <div className="co-name">{bundle.company.name}</div>
                  {bundle.company.sub ? <div className="co-sub">{bundle.company.sub}</div> : null}
                </div>
              </div>
              {bundle.teamCast ? (
                <div className="selfchip" title="Your seat in this room">
                  {av(bundle.self.seatKey, bundle.self.name, 'av')}
                  <div>
                    <div className="sc-you">You are {bundle.self.name}</div>
                    <div className="sc-role">{bundle.self.role ?? bundle.self.short ?? ''}</div>
                  </div>
                </div>
              ) : null}
              <div className="clock">
                <div className="wkbox">
                  <div className="n">Week {week.n}</div>
                  <div className="l">{week.title} · {week.n} / {bundle.weekCount}</div>
                </div>
                {phase === 'run' && !decided ? (
                  <div className={`hudclock${buzzer ? ' buzzer' : low ? ' low' : ''}`}>
                    <div className="hc-row">
                      <span className="hc-day">Day {curDay}<small>/{totalDays}</small></span>
                      <span className="hc-time">{buzzer ? "time's up" : `${mm}:${ss}`}</span>
                    </div>
                    <div className="hc-bar"><span style={{ width: `${buzzer ? 0 : Math.max(0, (daysLeft / totalDays) * 100)}%` }} /></div>
                    <div className="hc-hint">{buzzer ? 'Make the call now' : 'Time is short — decide'}</div>
                  </div>
                ) : null}
              </div>
            </div>
            {phase === 'run' && !decided ? (
              <div className="days">
                {Array.from({ length: totalDays }, (_, i) => {
                  const day = i + 1;
                  return <span key={i} className={`day-dot${day < curDay ? ' past' : day === curDay ? ' now' : ''}`} />;
                })}
                <span className="daylabel">Day {curDay} / {totalDays}</span>
              </div>
            ) : null}
            <div className="meters">
              {bundle.drivers.map((d) => {
                const val = drivers[d.key] ?? d.val;
                const pct = Math.round(((val - d.min) / Math.max(1, d.max - d.min)) * 100);
                // movement stays visible: this week's ruling once decided, else last week's
                const dlt = decided && ruling ? ruling.deltas[d.key] ?? 0 : bundle.lastDeltas[d.key] ?? 0;
                return (
                  <div className="meter" key={d.key}>
                    <div className="mh">
                      <span className="ml">{d.label}</span>
                      <span className="mv">
                        {Math.round(val)}
                        {dlt ? <span className={`mv-d ${dlt > 0 ? 'up' : 'dn'}`}>{dlt > 0 ? '▲' : '▼'}{Math.abs(dlt)}</span> : null}
                      </span>
                    </div>
                    <div className="bar"><span style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: meterColor(pct) }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div id="main">
          {notice ? (
            <div className="solo-notice" role="alert" onClick={() => setNotice(null)}>
              {notice} <span className="solo-notice-x">✕</span>
            </div>
          ) : null}

          {phase === 'intro' ? (
            <div className="intro">
              {bundle.intro?.kick ? <div className="kick">{String(bundle.intro.kick)}</div> : null}
              <h1>{String(bundle.intro?.title ?? bundle.scenarioTitle)}</h1>
              {/* role/paras/setup carry inline <b>/<i> from our authored content */}
              {bundle.intro?.role ? <div className="role" dangerouslySetInnerHTML={{ __html: String(bundle.intro.role) }} /> : null}
              {Array.isArray(bundle.intro?.paras) ? (bundle.intro!.paras as string[]).map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />) : null}
              {bundle.intro?.setup ? <div className="setup" dangerouslySetInnerHTML={{ __html: String(bundle.intro.setup) }} /> : null}
              {bundle.teamCast ? (
                <div className="tc-intro">
                  <div className="disp-h">You’re in the room together</div>
                  <p className="tc-note">
                    This crisis is being led by your whole team — not one person. You are <b>{bundle.self.name}</b>
                    {bundle.self.role ? <>, {bundle.self.role}</> : null}. Each week the team deliberates in the Decision Room and
                    <b> anyone can lock the call</b> — who steps up, and whether the room is with them, is part of what’s measured.
                  </p>
                  {bundle.myHolds.length ? (
                    <div className="myknow intro-know">
                      <div className="mk-h">What only you know this week</div>
                      {bundle.myHolds.map((h, i) => (
                        <div className={`mk-item${h.critical ? ' crit' : ''}`} key={i}>
                          {h.critical ? <span className="mk-crit">critical</span> : null}
                          {h.topic ? <div className="mk-topic">{h.topic}</div> : null}
                          <div className="mk-reveal">{h.reveal}</div>
                        </div>
                      ))}
                      <div className="mk-foot">It’s yours to surface — or hold. The team can only weigh what reaches the room.</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="disp-h">The team you walk in with</div>
                  <div className="disp-grid">
                    {DISPOSITIONS.map((d) => (
                      <button key={d.key} className={`disp${disp === d.key ? ' on' : ''}`} onClick={() => setDisp(d.key)}>
                        <div className="dt">{d.label} <span className="dtag">{d.tag}</span></div>
                        <div className="dc">{d.cap}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button className="start-btn" onClick={takeCommand}>{bundle.teamCast ? 'Enter the room →' : 'Take command →'}</button>
            </div>
          ) : decided && ruling ? (
            <div className="transition">
              <div className="tk2">Week {week.n} resolves</div>
              <h2>The week moves</h2>
              <p>{ruling.narrative}</p>
              <div className="movement">
                <div className="mv-h">How the world moved</div>
                <div className="mv-grid">
                  {bundle.drivers.map((d) => {
                    const dl = ruling.deltas[d.key] ?? 0;
                    const cls = dl > 0 ? 'up' : dl < 0 ? 'dn' : 'flat';
                    return (
                      <div className={`mv-row ${cls}`} key={d.key}>
                        <span>{d.label}</span>
                        <span className="mv-val">{dl > 0 ? '+' : ''}{dl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {ruling.teamReactions.map((r, i) => (
                <div className="react-row" key={i}>
                  {av(r.who, castByKey.get(r.who)?.name, 'react-av')}
                  <div className="react-bub">
                    <div className="react-who">{castByKey.get(r.who)?.name ?? r.who}</div>
                    <div className="react-txt">{r.text}</div>
                  </div>
                </div>
              ))}
              {lastWeek ? (
                <Link className="cont" href={`/solo/${bundle.sessionId}/debrief?t=${encodeURIComponent(bundle.token)}`}>See your game-film debrief →</Link>
              ) : (
                <Link className="cont" href={`/solo/${bundle.sessionId}?t=${encodeURIComponent(bundle.token)}&week=${week.n + 1}`}>Continue to Week {week.n + 1} →</Link>
              )}
            </div>
          ) : (
            <>
              <div className="weekbanner">
                <div className="wb-k">Week {week.n} · {week.title}</div>
                <h2>The situation</h2>
                <p>{week.situation}</p>
              </div>

              {bundle.teamCast && bundle.myHolds.length ? (
                <div className="myknow">
                  <div className="mk-h">What only you know this week</div>
                  {bundle.myHolds.map((h, i) => {
                    const done = surfaced.has(h.topic ?? '');
                    return (
                      <div className={`mk-item${h.critical ? ' crit' : ''}`} key={i}>
                        {h.critical ? <span className="mk-crit">critical</span> : null}
                        {h.topic ? <div className="mk-topic">{h.topic}</div> : null}
                        <div className="mk-reveal">{h.reveal}</div>
                        <button className={`mk-surface${done ? ' done' : ''}`} disabled={done} onClick={() => surface(h.topic ?? '')}>
                          {done ? '✓ Surfaced to the room' : 'Surface to the room'}
                        </button>
                      </div>
                    );
                  })}
                  <div className="mk-foot">Surface it in the room if it should shape the call — or hold it and see what happens.</div>
                </div>
              ) : null}

              <div className="rail">
                <div className="rail-h">{bundle.teamCast ? 'The room — your teammates' : 'Your team — reach out'}</div>
                <div className="rail-row">
                  {bundle.cast.map((c) => (
                    <div className="tchip" key={c.seatKey}>
                      {av(c.seatKey, c.name, 'av')}
                      <div>
                        <div className="tn">{c.name}</div>
                        <div className="tr">{c.short ?? c.role}</div>
                      </div>
                      <button className="ask" onClick={() => { setAsking(c.seatKey); setAskText(''); setAskErr(null); }}>Ask</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="feed" ref={feedRef}>
                {timeline.map((it) => {
                  const c = it.from ? castByKey.get(it.from) : null;
                  const kindCls = it.kind === 'surprise' ? 'surprise' : it.kind === 'pulse' ? 'reveal' : 'inbound';
                  return (
                    <div className={`card ${kindCls}`} key={it.key}>
                      {it.kind === 'surprise' ? <div className="c-kick surprise">Incoming</div> : it.kind === 'pulse' ? <div className="c-kick reveal">A quiet word</div> : null}
                      <div className="c-from">
                        {av(it.from ?? 'x', c?.name)}
                        <div>
                          <div className="c-name">{c?.name ?? it.from ?? '—'}</div>
                          <div className="c-role">{c?.short ?? c?.role ?? ''}</div>
                        </div>
                        {it.day ? <span className="c-time">Day {it.day}</span> : null}
                      </div>
                      {it.title ? <div className="c-title">{it.title}</div> : null}
                      <p className="c-body">{it.text}</p>
                      {it.from && it.kind !== 'pulse' ? (
                        <div className="card-actions">
                          <button className="reply-inline" onClick={() => { setAsking(it.from!); setAskText(''); setAskErr(null); }}>Reply to {c?.name?.split(' ')[0] ?? 'them'}</button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {asks.map((a) => {
                  const c = castByKey.get(a.advisorKey);
                  return (
                    <div key={a.id}>
                      <div className="card reply">
                        <div className="c-kick reply">You asked {c?.name?.split(' ')[0] ?? a.advisorKey}: “{a.question}”</div>
                        <div className="c-from">
                          {av(a.advisorKey, c?.name)}
                          <div>
                            <div className="c-name">{c?.name ?? a.advisorKey}</div>
                            <div className="c-role">{c?.short ?? c?.role ?? ''}</div>
                          </div>
                        </div>
                        <p className="c-body">{a.reply}</p>
                      </div>
                      {a.hold ? (
                        <div className="card reveal">
                          <div className={`c-kick reveal`}>{a.hold.surfaced ? 'Now it comes out' : 'They hold something back'}</div>
                          <p className="c-body">{a.hold.text}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {/* team-cast: holds a teammate has surfaced into the room */}
                {roomSurfaces.map((s, i) => (
                  <div className="card reveal" key={`surf${i}`}>
                    <div className="c-kick reveal">{castByKey.get(s.from)?.name?.split(' ')[0] ?? s.from} surfaced {s.critical ? 'something critical' : 'what they were holding'}</div>
                    {s.topic ? <div className="c-title">{s.topic}</div> : null}
                    <p className="c-body">{s.text}</p>
                  </div>
                ))}
              </div>

              {bundle.teamCast ? (
                <div className="droom-solo">
                  <div className="ds-h">Decision Room — Week {week.n}</div>
                  <div className="ds-sub">Put the options on the table, take a stance, and lock the team’s call. Anyone can lock — the room’s buy-in is part of the read.</div>
                  {board.options.length === 0 ? (
                    <div className="ds-empty">No options yet. Propose the team’s first direction below.</div>
                  ) : (
                    board.options.map((o) => {
                      const mine = o.stances.find((st) => st.seat === bundle.seatKey)?.valence;
                      const support = o.stances.filter((st) => st.valence === 1).length;
                      const dissent = o.stances.filter((st) => st.valence === -1).length;
                      return (
                        <div className="ds-opt" key={o.optionId}>
                          <div className="ds-opt-top">
                            <div className="ds-summary">{o.summary}</div>
                            <div className="ds-author">{o.author === bundle.seatKey ? 'you' : castByKey.get(o.author)?.name?.split(' ')[0] ?? o.author}</div>
                          </div>
                          <div className="ds-tally"><span className="ds-pill up">▲ {support}</span><span className="ds-pill dn">▼ {dissent}</span></div>
                          <div className="ds-actions">
                            <button className={`ds-btn${mine === 1 ? ' on up' : ''}`} onClick={() => doStance(o.optionId, mine === 1 ? 0 : 1)}>Support</button>
                            <button className={`ds-btn${mine === -1 ? ' on dn' : ''}`} onClick={() => doStance(o.optionId, mine === -1 ? 0 : -1)}>Dissent</button>
                            <button className="ds-btn lock" disabled={deciding} onClick={() => lockAndRule(o.optionId)}>{deciding ? '…' : 'Lock this call'}</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="ds-compose">
                    <textarea value={propDraft} onChange={(e) => setPropDraft(e.target.value)} placeholder="Propose a direction the team could take…" rows={2} />
                    <button className="ds-propose" disabled={!propDraft.trim()} onClick={propose}>Put on the table</button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* fixed decision dock — solo only (team-cast decides in the Decision Room) */}
      {phase === 'run' && !decided && !bundle.teamCast ? (
        <div className="dock">
          <div className="dock-in">
            <div className="dock-lbl">
              <span className="l">Your call — Week {week.n}</span>
              <span className="adv">{buzzer ? 'The week ran out — make the call' : low ? 'Time is short — decide, or buy more time' : 'Decide early and time jumps ahead'}</span>
            </div>
            <div className="dock-row">
              <textarea value={decisionText} onChange={(e) => setDecisionText(e.target.value)} placeholder="This week I'm deciding to…" disabled={deciding} />
              <button className="send" disabled={deciding || decisionText.trim().length < 8} onClick={submitDecision}>
                {deciding ? <span className="thinking"><span /><span /><span /></span> : 'Send'}
              </button>
              <button className="more" onClick={takeReprieve} disabled={!canReprieve}>
                {canReprieve ? `+${config.extraDaysPerReprieve}d` : 'No more'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* compose modal */}
      {asking ? (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) { setAsking(null); setAskText(''); } }}>
          <div className="modal">
            <div className="modal-h">
              {av(asking, castByKey.get(asking)?.name, 'av')}
              <div>
                <div className="nm">{castByKey.get(asking)?.name ?? asking}</div>
                <div className="rl">{castByKey.get(asking)?.short ?? castByKey.get(asking)?.role ?? ''}</div>
              </div>
              <button className="x" onClick={() => { setAsking(null); setAskText(''); }}>×</button>
            </div>
            <div className="modal-b">
              <p className="hint">Ask a real question. What they hold back until pressed is part of the test.</p>
              <textarea value={askText} onChange={(e) => setAskText(e.target.value)} placeholder={`Ask ${castByKey.get(asking)?.name?.split(' ')[0] ?? 'them'}…`} autoFocus />
              {askErr ? <div className="modal-err">{askErr}</div> : null}
              <div className="modal-actions">
                <button className="vm" onClick={() => { setAsking(null); setAskText(''); setAskErr(null); }}>Cancel</button>
                <button className="snd" disabled={askBusy || !askText.trim()} onClick={() => sendAsk(asking)}>
                  {askBusy ? <span className="thinking"><span /><span /><span /></span> : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
