'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, type ScenarioOption, type SessionLink } from '@/lib/facilitator-actions';

// Facilitator: spin up a fresh LIVE session for a scenario, with random per-seat magic
// links to hand out. Replaces the SQL/token-rotation step from the go-live runbook.
const DISPOSITIONS = [
  { key: 'request', label: 'On request (neutral)' },
  { key: 'served', label: 'Forthcoming (trust earned)' },
  { key: 'guarded', label: 'Guarded (low trust)' },
  { key: 'surprise', label: 'Surprise — resolve from the CEO’s spine history' },
];

export function NewSession({ scenarios }: { scenarios: ScenarioOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const [disposition, setDisposition] = useState('request');
  const [castAsTeam, setCastAsTeam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sessionId: string; mode: string; links: SessionLink[] } | null>(null);
  const [err, setErr] = useState('');

  const chosen = scenarios.find((s) => s.id === scenarioId);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const create = async () => {
    setBusy(true);
    setErr('');
    const res = await createSession({
      scenarioId,
      disposition: chosen?.mode === 'solo' ? disposition : undefined,
      castAsTeam: chosen?.mode === 'solo' ? castAsTeam : undefined,
    });
    setBusy(false);
    if (res.ok && res.sessionId) setResult({ sessionId: res.sessionId, mode: res.mode ?? 'team', links: res.links ?? [] });
    else setErr(res.reason ?? 'failed');
  };

  if (!scenarios.length) return null;

  return (
    <div className="newsession">
      {!open ? (
        <button className="btn primary" onClick={() => setOpen(true)}>
          + New session
        </button>
      ) : (
        <div className="ns-panel">
          {!result ? (
            <>
              <div className="ns-title">Start a session</div>
              <div className="ns-row">
                <label>
                  Scenario
                  <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} · {s.mode} · {s.seats} seats
                      </option>
                    ))}
                  </select>
                </label>
                {chosen?.mode === 'solo' && !castAsTeam ? (
                  <label>
                    Disposition
                    <select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
                      {DISPOSITIONS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              {chosen?.mode === 'solo' ? (
                <label className="ns-check">
                  <input type="checkbox" checked={castAsTeam} onChange={(e) => setCastAsTeam(e.target.checked)} />
                  <span>
                    <b>Cast as a team</b> — fill every seat with a real player. The room deliberates and locks each weekly
                    call together in the Decision Room (anyone can lock). Advisors hold their own info to surface.
                  </span>
                </label>
              ) : null}
              <p className="db-sub">
                Creates a <b>live</b> session with fresh magic links.{' '}
                {chosen?.mode === 'solo'
                  ? castAsTeam
                    ? 'Every seat gets a link — the solo scenario, played by a whole team.'
                    : 'The CEO seat gets a link; advisors are AI-cast.'
                  : 'Every seat gets its own participant link.'}
              </p>
              {err ? <div className="fac-flash">Couldn’t create: {err}</div> : null}
              <div className="ns-actions">
                <button className="btn primary" onClick={create} disabled={busy || !scenarioId}>
                  {busy ? 'Creating…' : 'Create session'}
                </button>
                <button className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="ns-title">Session live — hand out the links</div>
              <div className="ns-links">
                {result.links.length === 0 ? (
                  <div className="db-dim">No human seats (all AI-cast).</div>
                ) : (
                  result.links.map((l) => (
                    <div className="ns-link" key={l.seatKey}>
                      <div className="ns-link-who">
                        <b>{l.name}</b> <span className="db-role">{l.role}</span>
                      </div>
                      <input readOnly value={`${origin}${l.path}`} onFocus={(e) => e.currentTarget.select()} />
                      <button
                        className="btn ghost"
                        onClick={() => navigator.clipboard?.writeText(`${origin}${l.path}`)}
                        title="Copy link"
                      >
                        Copy
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="ns-actions">
                <button className="btn primary" onClick={() => router.push(`/facilitator/${result.sessionId}`)}>
                  Open console →
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setResult(null);
                    setOpen(false);
                    router.refresh();
                  }}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
