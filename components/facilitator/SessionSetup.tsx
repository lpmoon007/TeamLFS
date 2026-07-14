'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, type SessionLink } from '@/lib/facilitator-actions';

// Session Setup — cast a scenario and spin up a live session with per-seat magic links.
// Solo: pick the team disposition, or "cast as a team" to fill every seat with a player.
const DISPOSITIONS = [
  { key: 'request', label: 'On request (neutral)' },
  { key: 'served', label: 'Forthcoming (trust earned)' },
  { key: 'guarded', label: 'Guarded (low trust)' },
  { key: 'surprise', label: 'Surprise — resolve from the CEO’s spine history' },
];

export function SessionSetup({ scenarioId, mode }: { scenarioId: string; mode: 'solo' | 'team' }) {
  const router = useRouter();
  const [disposition, setDisposition] = useState('request');
  const [castAsTeam, setCastAsTeam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ sessionId: string; links: SessionLink[] } | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const create = async () => {
    setBusy(true);
    setErr('');
    const res = await createSession({
      scenarioId,
      disposition: mode === 'solo' ? disposition : undefined,
      castAsTeam: mode === 'solo' ? castAsTeam : undefined,
    });
    setBusy(false);
    if (res.ok && res.sessionId) setResult({ sessionId: res.sessionId, links: res.links ?? [] });
    else setErr(res.reason ?? 'failed');
  };

  if (result) {
    return (
      <div className="setup">
        <div className="setup-live">Session live — hand out the links</div>
        <div className="ns-links">
          {result.links.length === 0 ? (
            <div className="db-dim">No human seats (all AI-cast).</div>
          ) : (
            result.links.map((l) => (
              <div className="ns-link" key={l.seatKey}>
                <div className="ns-link-who"><b>{l.name}</b> <span className="db-role">{l.role}</span></div>
                <input readOnly value={`${origin}${l.path}`} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(`${origin}${l.path}`)}>Copy</button>
              </div>
            ))
          )}
        </div>
        <div className="ed-actions">
          <button className="btn primary" onClick={() => router.push(`/facilitator/${result.sessionId}`)}>Open console →</button>
          <button className="btn ghost" onClick={() => setResult(null)}>Set up another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup">
      {mode === 'solo' && !castAsTeam ? (
        <label className="ed-field ed-narrow">
          <span>Team disposition</span>
          <select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
            {DISPOSITIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </label>
      ) : null}
      {mode === 'solo' ? (
        <label className="ns-check">
          <input type="checkbox" checked={castAsTeam} onChange={(e) => setCastAsTeam(e.target.checked)} />
          <span><b>Cast as a team</b> — every seat becomes a real player; the room deliberates and locks each weekly call together in the Decision Room.</span>
        </label>
      ) : null}
      <p className="db-sub">
        Creates a <b>live</b> session with fresh magic links.{' '}
        {mode === 'solo' ? (castAsTeam ? 'Every seat gets a link.' : 'The CEO seat gets a link; advisors are AI-cast.') : 'Every seat gets its own link.'}
      </p>
      {err ? <div className="fac-flash">Couldn’t create: {err}</div> : null}
      <div className="ed-actions">
        <button className="btn primary" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create session'}</button>
      </div>
    </div>
  );
}
