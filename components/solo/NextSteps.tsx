'use client';
import { useEffect, useState } from 'react';
import { DictateButton } from '@/components/DictateButton';
import { getSessionChallenge, createChallenge, logChallengeCheckin, type Challenge } from '@/lib/challenge-actions';

// "Where to next" — the explicit fork at the end of a debrief. The insight is on the table;
// now it names the three honest options: commit to a 30-day behavioral challenge (the real
// bridge to change), run another scenario, or close out. The challenge is built from the
// leader's weakest read, pre-filled and editable, then persisted with a day counter and a
// practice log so the debrief link becomes the place they come back to.

export function NextSteps({
  sessionId,
  token,
  focusKey,
  focusLabel,
  suggestedBehavior,
  libraryHref,
}: {
  sessionId: string;
  token?: string;
  focusKey?: string;
  focusLabel?: string;
  suggestedBehavior?: string;
  libraryHref: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [mode, setMode] = useState<'doors' | 'form'>('doors');

  useEffect(() => {
    let live = true;
    getSessionChallenge({ sessionId, token })
      .then((r) => { if (live) { setChallenge(r.challenge); setLoaded(true); } })
      .catch(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [sessionId, token]);

  if (challenge) return <ActiveChallenge challenge={challenge} sessionId={sessionId} token={token} onChange={setChallenge} libraryHref={libraryHref} />;

  return (
    <div className="next">
      <div className="next-lead">
        You just saw exactly where this run cost you. That insight is worth nothing unless something changes — so here’s the honest fork.
      </div>

      {mode === 'form' ? (
        <ChallengeForm
          sessionId={sessionId}
          token={token}
          focusKey={focusKey}
          focusLabel={focusLabel}
          suggestedBehavior={suggestedBehavior}
          onCancel={() => setMode('doors')}
          onCommitted={setChallenge}
        />
      ) : (
        <div className="next-doors">
          <button type="button" className="door primary" onClick={() => setMode('form')} disabled={!loaded}>
            <div className="door-k">Change one habit</div>
            <div className="door-h">Take the 30-day challenge</div>
            <div className="door-t">
              Commit to the one behavior that would move your weakest read{focusLabel ? <> — <b>{focusLabel.toLowerCase()}</b></> : ''}. Practice it for 30 days; track it here.
            </div>
          </button>
          <a className="door" href={libraryHref}>
            <div className="door-k">Put it to the test</div>
            <div className="door-h">Run another scenario</div>
            <div className="door-t">Take what you just learned into a fresh crisis and see if the read moves.</div>
          </a>
          <button type="button" className="door ghost" onClick={() => setChallenge({ id: '', behavior: '', cue: null, focusKey: null, focusLabel: null, targetDays: 0, status: 'dismissed', createdAt: '', dayNumber: 0, checkins: [] })}>
            <div className="door-k">Not this time</div>
            <div className="door-h">Close it out</div>
            <div className="door-t">Sit with it. The insight’s still here whenever you come back.</div>
          </button>
        </div>
      )}
    </div>
  );
}

function ChallengeForm({
  sessionId,
  token,
  focusKey,
  focusLabel,
  suggestedBehavior,
  onCancel,
  onCommitted,
}: {
  sessionId: string;
  token?: string;
  focusKey?: string;
  focusLabel?: string;
  suggestedBehavior?: string;
  onCancel: () => void;
  onCommitted: (c: Challenge) => void;
}) {
  const [behavior, setBehavior] = useState(suggestedBehavior ?? '');
  const [cue, setCue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const commit = async () => {
    if (behavior.trim().length < 4 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await createChallenge({ sessionId, token, behavior, cue, focusKey, focusLabel });
      if (res.ok && res.challenge) onCommitted(res.challenge);
      else setErr(res.reason === 'not_authorized' ? 'This debrief link can’t start a challenge — open it from your own run link.' : 'Couldn’t save just now — try again.');
    } catch {
      setErr('Couldn’t save just now — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cform">
      <div className="cform-h">Your 30-day challenge{focusLabel ? <> — <span className="cform-focus">{focusLabel}</span></> : ''}</div>
      <label className="cform-lab">The one behavior I’m changing</label>
      <div className="cform-row">
        <textarea
          className="cform-ta"
          value={behavior}
          onChange={(e) => setBehavior(e.target.value)}
          placeholder="e.g. Before every decision, ask the second question — don’t stop at the first answer."
          rows={2}
        />
        <DictateButton onText={(t) => setBehavior((v) => (v ? v + ' ' + t : t))} />
      </div>
      <label className="cform-lab">My trigger — when will I do it? (optional)</label>
      <div className="cform-row">
        <input
          className="cform-in"
          value={cue}
          onChange={(e) => setCue(e.target.value)}
          placeholder="e.g. Whenever I’m about to commit to a call…"
        />
        <DictateButton onText={(t) => setCue((v) => (v ? v + ' ' + t : t))} />
      </div>
      {err ? <div className="cform-err">{err}</div> : null}
      <div className="cform-actions">
        <button type="button" className="cform-commit" disabled={busy || behavior.trim().length < 4} onClick={commit}>
          {busy ? 'Committing…' : 'Commit to 30 days'}
        </button>
        <button type="button" className="cform-cancel" onClick={onCancel} disabled={busy}>Back</button>
      </div>
    </div>
  );
}

function ActiveChallenge({
  challenge,
  sessionId,
  token,
  onChange,
  libraryHref,
}: {
  challenge: Challenge;
  sessionId: string;
  token?: string;
  onChange: (c: Challenge | null) => void;
  libraryHref: string;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // the "dismissed" sentinel (Not this time) — a soft close, not a stored challenge
  if (challenge.status === 'dismissed') {
    return (
      <div className="next">
        <div className="next-closed">
          Closed out — no challenge this time. When you’re ready, you can{' '}
          <button type="button" className="lnk" onClick={() => onChange(null)}>pick this back up</button> or{' '}
          <a className="lnk" href={libraryHref}>run another scenario</a>.
        </div>
      </div>
    );
  }

  const checkin = async (did: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await logChallengeCheckin({ challengeId: challenge.id, sessionId, token, did, note });
      if (res.ok && res.challenge) { onChange(res.challenge); setNote(''); }
    } finally {
      setBusy(false);
    }
  };

  const kept = challenge.checkins.filter((c) => c.did).length;

  return (
    <div className="next">
      <div className="chal">
        <div className="chal-top">
          <div className="chal-badge">Day {challenge.dayNumber} <span>/ {challenge.targetDays}</span></div>
          <div className="chal-head">
            <div className="chal-k">You’re on a 30-day challenge{challenge.focusLabel ? <> · {challenge.focusLabel}</> : ''}</div>
            <div className="chal-behavior">“{challenge.behavior}”</div>
            {challenge.cue ? <div className="chal-cue">{challenge.cue}</div> : null}
          </div>
        </div>
        <div className="chal-bar"><div className="chal-fill" style={{ width: `${Math.round((challenge.dayNumber / challenge.targetDays) * 100)}%` }} /></div>
        <div className="chal-meta">{kept} check-in{kept === 1 ? '' : 's'} logged{kept ? ' — keep the streak' : ' — log the first time you catch yourself doing it'}.</div>

        <div className="chal-log">
          <div className="cform-row">
            <input
              className="cform-in"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened when you practiced it today? (optional)"
              onKeyDown={(e) => { if (e.key === 'Enter') checkin(true); }}
            />
            <DictateButton onText={(t) => setNote((v) => (v ? v + ' ' + t : t))} />
          </div>
          <div className="chal-actions">
            <button type="button" className="chal-did" disabled={busy} onClick={() => checkin(true)}>I practiced it ✓</button>
            <button type="button" className="chal-miss" disabled={busy} onClick={() => checkin(false)}>Missed it — noted</button>
          </div>
        </div>

        {challenge.checkins.length ? (
          <div className="chal-history">
            {challenge.checkins.slice().reverse().map((c) => (
              <div className={`chal-entry ${c.did ? 'did' : 'miss'}`} key={c.id}>
                <span className="chal-dot" aria-hidden />
                <span className="chal-entry-txt">{c.did ? 'Practiced' : 'Missed'}{c.note ? ` — ${c.note}` : ''}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="chal-foot">
          Ready for another? <a className="lnk" href={libraryHref}>Run another scenario →</a>
        </div>
      </div>
    </div>
  );
}
