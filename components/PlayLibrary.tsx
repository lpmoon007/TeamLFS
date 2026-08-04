'use client';
import { useState } from 'react';
import { startLeaderRun, type PlayableScenario, type LeaderRun } from '@/lib/leader-actions';

// Leader play surface: pick a scenario → start a run (pre-linked to your memory profile) →
// drop straight in. Plus your own past runs, to resume a live one or revisit a debrief.
export function PlayLibrary({ scenarios, runs, name }: { scenarios: PlayableScenario[]; runs: LeaderRun[]; name: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const play = async (id: string) => {
    if (busy) return;
    setBusy(id);
    setErr(null);
    try {
      const res = await startLeaderRun(id);
      if (res.ok && res.url) {
        window.location.href = res.url; // into the run
        return;
      }
      setErr('Couldn’t start that run — try again in a moment.');
    } catch {
      setErr('Couldn’t start that run — try again in a moment.');
    }
    setBusy(null);
  };

  // a run is "in progress" until every weekly call is made; finished runs carry a score
  const inProgress = runs.filter((r) => !r.complete);
  const done = runs.filter((r) => r.complete);

  return (
    <>
      <div className="play-hi">Welcome{name ? `, ${name}` : ''}. Pick a crisis and lead your way through it.</div>

      {inProgress.length ? (
        <section className="play-sec">
          <div className="play-sec-h">Pick up where you left off</div>
          <div className="play-runs">
            {inProgress.map((r) => (
              <a key={r.sessionId} className="play-run live" href={r.playUrl}>
                <span className="play-run-t">{r.scenario}</span>
                <span className="play-run-when">in progress</span>
                <span className="play-run-badge">Resume →</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="play-sec">
        <div className="play-sec-h">Scenarios</div>
        {scenarios.length ? (
          <div className="lib-grid">
            {scenarios.map((s) => (
              <div className="lib-card play-scn" key={s.id}>
                <div className="lib-card-top"><strong>{s.title}</strong></div>
                {s.summary ? <div className="lib-card-sub" dangerouslySetInnerHTML={{ __html: s.summary }} /> : null}
                <div className="lib-card-meta">
                  <span className={`realism-tag ${s.realism}`}>{s.realism}</span>
                  {s.weekCount ? (<><span>·</span><span>{s.weekCount} weeks</span></>) : null}
                </div>
                <button className="btn primary play-btn" disabled={busy === s.id} onClick={() => play(s.id)}>
                  {busy === s.id ? 'Starting…' : 'Play →'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="db-sub">No scenarios available yet.</p>
        )}
        {err ? <p className="play-err">{err}</p> : null}
      </section>

      {done.length ? (
        <section className="play-sec">
          <div className="play-sec-h">Your past runs</div>
          <div className="play-runs">
            {done.map((r) => (
              <a key={r.sessionId} className="play-run" href={r.debriefUrl}>
                {r.score !== null ? (
                  <span className="play-score" title={r.grade ?? undefined}>{r.score}</span>
                ) : null}
                <span className="play-run-t">{r.scenario}</span>
                {r.grade ? <span className="play-run-grade">{r.grade}</span> : null}
                <span className="play-run-when">{r.startedAt ? new Date(r.startedAt).toLocaleDateString() : ''}</span>
                <span className="play-run-badge ghost">Debrief →</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
