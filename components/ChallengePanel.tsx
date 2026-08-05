'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateReps, commitRep, checkinMyChallenge, answerFollowUp, setMyChallengeStatus, type LeaderChallenge, type RepOption } from '@/lib/challenge-actions';

// The 30-Day Rep (Screen-14 spec) — the one mechanism that converts insight into changed
// behaviour. Three options generated from the leader's gap (at least one aimed at the UNSOLVED
// half), the obstacle named before commit, a daily 1–10 rating, a single ≤3/≥8 follow-up, and
// their own obstacle quoted back on a week-two dip. One active rep at a time.

const REASONS: Record<string, string> = {
  no_api_key: 'Rep generation isn’t configured (no API key).',
  no_runs: 'Finish a run first — a rep comes from your gap.',
  no_unsolved_option: 'Couldn’t aim a rep at your gap — try again.',
  too_few: 'Couldn’t generate three usable reps — try again.',
  model_unreachable: 'Couldn’t reach the model — try again.',
  already_active: 'You already have an active rep.',
  invalid_rep: 'That rep wasn’t valid — regenerate.',
};

function ChooseRep() {
  const router = useRouter();
  const [options, setOptions] = useState<RepOption[] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [obstacle, setObstacle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const gen = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSel(null);
    try {
      const res = await generateReps();
      if (res.ok && res.options) setOptions(res.options);
      else setErr(REASONS[res.reason ?? ''] ?? 'Couldn’t generate — try again.');
    } catch { setErr('Couldn’t generate — try again.'); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (sel == null || !options || busy) return;
    setBusy(true); setErr(null);
    try {
      const o = options[sel];
      const res = await commitRep({ text: o.text, targetMarker: o.targetMarker, obstacle: obstacle || undefined });
      if (res.ok) router.refresh();
      else { setErr(REASONS[res.reason ?? ''] ?? 'Couldn’t commit — try again.'); setBusy(false); }
    } catch { setErr('Couldn’t commit — try again.'); setBusy(false); }
  };

  if (!options) {
    return (
      <section className="pf-sec">
        <div className="pf-sec-h">Your 30-day rep — where a finding becomes a habit</div>
        <p className="pf-empty">
          One daily behaviour, chosen from your gap, practised for 30 days — the one thing on this page that <b>moves</b> you
          rather than describes you. I’ll offer three, each aimed at a specific marker, and at least one at the half of the
          behaviour you haven’t already solved.
        </p>
        <div className="ed-actions" style={{ marginTop: 14 }}>
          <button className="btn primary" disabled={busy} onClick={gen}>{busy ? 'Reading your record…' : 'Choose my rep'}</button>
          {err ? <span className="ed-flash err">{err}</span> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="pf-sec">
      <div className="pf-sec-h">Your 30-day rep — pick one</div>
      <p className="pf-lead" style={{ marginBottom: 14 }}>A rep works only when it targets the half of the behaviour you’re <em>not</em> already good at. Pick the one you’ll actually do on your worst day.</p>
      <div className="rep-opts">
        {options.map((o, i) => (
          <button key={i} className={`rep-opt${sel === i ? ' sel' : ''}`} onClick={() => setSel(i)}>
            <span className="rep-radio" aria-hidden />
            <span className="rep-opt-body">
              <span className="rep-opt-text">{o.text}</span>
              <span className="rep-opt-tag">{o.targetLabel}{o.hardest ? ' · hardest, most specific' : ''} — {o.annotation}</span>
            </span>
          </button>
        ))}
      </div>

      {sel != null ? (
        <div className="rep-obst">
          <div className="rep-obst-l">Before you commit</div>
          <div className="rep-obst-q">What will most likely stop you doing this?</div>
          <p className="rep-obst-s">One sentence. Naming the obstacle in advance is the single cheapest thing that raises follow-through — and if your consistency dips in week two, this is the line we send back to you.</p>
          <textarea value={obstacle} onChange={(e) => setObstacle(e.target.value)} rows={2} placeholder="e.g. I’ll tell myself I’ll do it after the exec meeting, and the day will close" />
        </div>
      ) : null}

      <div className="ed-actions" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={busy || sel == null} onClick={commit}>{busy ? 'Committing…' : 'Commit to this rep →'}</button>
        <button className="btn ghost" disabled={busy} onClick={gen}>Regenerate</button>
        <span className="pf-gen-note">{sel == null ? 'Select a rep. Check-ins begin tomorrow.' : 'Locked to your behavioral memory. Your next run scores this beside the scenario.'}</span>
        {err ? <span className="ed-flash err">{err}</span> : null}
      </div>
    </section>
  );
}

function Rating({ c, onChange }: { c: LeaderChallenge; onChange: (next: LeaderChallenge) => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const rate = async (r: number) => {
    if (busy) return;
    setBusy(true);
    const res = await checkinMyChallenge({ challengeId: c.id, rating: r });
    if (res.ok && res.challenge) onChange(res.challenge);
    setBusy(false);
  };
  const answer = async () => {
    if (busy || !c.followUp || !note.trim()) return;
    setBusy(true);
    const res = await answerFollowUp({ challengeId: c.id, day: c.followUp.day, note: note.trim() });
    if (res.ok && res.challenge) { onChange(res.challenge); setNote(''); }
    setBusy(false);
  };

  if (c.followUp) {
    return (
      <div className="rep-followup">
        <div className="rep-fu-q">{c.followUp.prompt}</div>
        <div className="rep-fu-row">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="One line…" autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') answer(); }} />
          <button className="btn primary" disabled={busy || !note.trim()} onClick={answer}>Log</button>
        </div>
      </div>
    );
  }
  const todays = c.checkins.find((k) => k.day === c.dayNumber)?.rating ?? null;
  return (
    <div className="rep-rate">
      <div className="rep-rate-l">{c.ratedToday ? `Today: ${todays}/10 — tap to change` : 'It’s the afternoon — how’d your effort go today? Rate it 1–10.'}</div>
      <div className="rep-rate-btns">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`rep-rn${todays === n ? ' on' : ''}`} disabled={busy} onClick={() => rate(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function ActiveRep({ c, onChange }: { c: LeaderChallenge; onChange: (next: LeaderChallenge | null) => void }) {
  const [busy, setBusy] = useState(false);
  const setStatus = async (status: 'done' | 'abandoned') => {
    if (busy) return;
    setBusy(true);
    const res = await setMyChallengeStatus({ challengeId: c.id, status });
    if (res.ok) onChange(status === 'abandoned' ? null : { ...c, status: 'done' });
    setBusy(false);
  };
  const complete = c.dayNumber >= c.targetDays;

  return (
    <section className="pf-sec">
      <div className="pf-sec-h">Your 30-day rep <span className="pf-badge" style={{ marginLeft: 8 }}>Day {c.dayNumber} / {c.targetDays}</span></div>
      <div className="rep-active">
        <div className="rep-active-text">{c.behavior}</div>
        {c.targetLabel ? <div className="rep-active-tag">Targets {c.targetLabel}</div> : null}

        {c.weekTwoNudge ? (
          <div className="rep-nudge">You said this would be what stops you: <b>“{c.weekTwoNudge}”</b>. Your last few days are under 5. Go now, before the meeting.</div>
        ) : null}

        <Rating c={c} onChange={(n) => onChange(n)} />

        <div className="rep-stats">
          <span><b>{c.keptDays}</b>/{c.targetDays} logged</span>
          {c.avgRating != null ? <span>avg <b>{c.avgRating}</b>/10</span> : null}
          {c.lastRatings.length ? <span className="rep-last">last: {c.lastRatings.map((r) => r.rating ?? '–').join(' · ')}</span> : null}
        </div>
        {c.obstacle ? <div className="rep-obst-echo">Obstacle on file: “{c.obstacle}”</div> : null}

        <div className="ch-rep-foot">
          {complete ? <button className="ch-complete" disabled={busy} onClick={() => setStatus('done')}>Mark complete →</button> : null}
          <button className="ch-drop" disabled={busy} onClick={() => setStatus('abandoned')}>Drop this rep</button>
        </div>
      </div>
    </section>
  );
}

function DoneRep({ c }: { c: LeaderChallenge }) {
  const OUT: Record<string, string> = { kept: 'Kept', partial: 'Partial', not_kept: 'Not kept' };
  return (
    <div className="rep-done">
      <div className="rep-done-top">
        <span className="rep-done-text">{c.behavior}</span>
        <span className={`rep-done-badge ${c.outcome ?? ''}`}>{OUT[c.outcome ?? ''] ?? 'Complete'}</span>
      </div>
      <div className="rep-stats">
        <span><b>{c.keptDays}</b>/{c.targetDays} days</span>
        {c.weekAvgs[0] != null || c.weekAvgs[3] != null ? <span>wk1 <b>{c.weekAvgs[0] ?? '–'}</b> → wk4 <b>{c.weekAvgs[3] ?? '–'}</b></span> : null}
        {c.targetLabel ? <span className="rep-last">{c.targetLabel} — next run scores the movement</span> : null}
      </div>
    </div>
  );
}

export function ChallengePanel({ challenges }: { challenges: LeaderChallenge[] }) {
  const [list, setList] = useState<LeaderChallenge[]>(challenges);
  const active = list.find((c) => c.status === 'active') ?? null;
  const done = list.filter((c) => c.status === 'done');

  const update = (id: string) => (next: LeaderChallenge | null) =>
    setList((l) => (next ? l.map((c) => (c.id === id ? next : c)) : l.filter((c) => c.id !== id)));

  return (
    <>
      {active ? <ActiveRep c={active} onChange={update(active.id)} /> : <ChooseRep />}
      {done.length ? (
        <section className="pf-sec">
          <div className="pf-sec-h">Completed reps</div>
          <div className="rep-done-list">{done.map((c) => <DoneRep key={c.id} c={c} />)}</div>
        </section>
      ) : null}
    </>
  );
}
