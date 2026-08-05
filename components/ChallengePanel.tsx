'use client';
import { useState } from 'react';
import { checkinMyChallenge, setMyChallengeStatus, type LeaderChallenge } from '@/lib/challenge-actions';

// The active-rep loop on the profile. A behaviour the leader committed to (from the coach)
// lives here across runs: a day counter, a one-tap daily check-in, a streak, and progress
// toward 30 days. Practising it is what turns a simulation finding into held-in-practice
// evidence — the check-ins feed back into the claim ledger's grading.

function Track({ kept, target }: { kept: number; target: number }) {
  const pct = Math.min(100, Math.round((kept / target) * 100));
  return (
    <div className="ch-track" aria-label={`${kept} of ${target} days practised`}>
      <div className="ch-track-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Rep({ c, onChange }: { c: LeaderChallenge; onChange: (next: LeaderChallenge | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  const check = async (did: boolean) => {
    if (busy) return;
    setBusy(true);
    const res = await checkinMyChallenge({ challengeId: c.id, did, note: note || undefined });
    if (res.ok && res.challenge) { onChange(res.challenge); setNote(''); setNoteOpen(false); }
    setBusy(false);
  };
  const setStatus = async (status: 'done' | 'abandoned') => {
    if (busy) return;
    setBusy(true);
    const res = await setMyChallengeStatus({ challengeId: c.id, status });
    if (res.ok) onChange(status === 'abandoned' ? null : { ...c, status: 'done' });
    setBusy(false);
  };

  const done = c.status === 'done';
  const complete = c.dayNumber >= c.targetDays;

  return (
    <div className={`ch-rep${done ? ' done' : ''}`}>
      <div className="ch-rep-top">
        <div className="ch-rep-behavior">{c.behavior}</div>
        {done ? <span className="ch-rep-badge done">Completed</span> : <span className="ch-rep-badge">Day {c.dayNumber} / {c.targetDays}</span>}
      </div>
      {c.cue ? <div className="ch-rep-cue"><span className="ch-rep-cue-k">Cue:</span> {c.cue}</div> : null}
      {c.focusLabel ? <div className="ch-rep-focus">Targets {c.focusLabel}</div> : null}

      <Track kept={c.keptDays} target={c.targetDays} />
      <div className="ch-rep-stats">
        <span><b>{c.keptDays}</b> day{c.keptDays === 1 ? '' : 's'} practised</span>
        {c.streak > 1 ? <span className="ch-streak">🔥 {c.streak}-day streak</span> : null}
      </div>

      {done ? null : (
        <div className="ch-rep-checkin">
          {c.checkedInToday ? (
            <div className="ch-checked">
              <span>✓ Logged today.</span>
              <button className="ch-relog" disabled={busy} onClick={() => check(false)}>Change to missed</button>
            </div>
          ) : (
            <>
              <button className="btn primary ch-did" disabled={busy} onClick={() => check(true)}>I practised it today</button>
              <button className="btn ghost ch-miss" disabled={busy} onClick={() => check(false)}>Missed today</button>
              <button className="ch-note-toggle" disabled={busy} onClick={() => setNoteOpen((v) => !v)}>{noteOpen ? '– note' : '+ note'}</button>
            </>
          )}
          {noteOpen && !c.checkedInToday ? (
            <input className="ch-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? (optional)" autoComplete="off" />
          ) : null}
        </div>
      )}

      <div className="ch-rep-foot">
        {complete && !done ? <button className="ch-complete" disabled={busy} onClick={() => setStatus('done')}>Mark complete →</button> : null}
        {done ? null : <button className="ch-drop" disabled={busy} onClick={() => setStatus('abandoned')}>Drop this rep</button>}
      </div>
    </div>
  );
}

export function ChallengePanel({ challenges }: { challenges: LeaderChallenge[] }) {
  const [list, setList] = useState<LeaderChallenge[]>(challenges);
  const active = list.filter((c) => c.status === 'active');
  const done = list.filter((c) => c.status === 'done');

  const update = (id: string) => (next: LeaderChallenge | null) =>
    setList((l) => (next ? l.map((c) => (c.id === id ? next : c)) : l.filter((c) => c.id !== id)));

  return (
    <section className="pf-sec">
      <div className="pf-sec-h">Your 30-day reps — where a finding becomes a habit</div>
      {active.length === 0 && done.length === 0 ? (
        <p className="pf-empty">
          No active rep yet. When your coach below lands on a behaviour worth changing, it offers a 30-day rep you can
          commit to — small enough to do on your worst day. It shows up here to practise daily, and the days you keep it
          become the strongest evidence in your record: a claim held in practice, not just in a simulation.
        </p>
      ) : (
        <>
          {active.length ? (
            <div className="ch-reps">
              {active.map((c) => <Rep key={c.id} c={c} onChange={update(c.id)} />)}
            </div>
          ) : (
            <p className="pf-empty">No active rep right now — ask the coach for your next one.</p>
          )}
          {done.length ? (
            <>
              <div className="sc-sub-h" style={{ marginTop: 18 }}>Completed</div>
              <div className="ch-reps">
                {done.map((c) => <Rep key={c.id} c={c} onChange={update(c.id)} />)}
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
