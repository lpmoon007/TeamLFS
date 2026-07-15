'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, createPerson, type SessionLink, type PersonItem, type ScenarioSeatInfo } from '@/lib/facilitator-actions';

// Session Setup — cast a scenario, assign real people to seats, and spin up a live session
// with per-seat magic links. Assigning a person pre-links that seat's runs to their
// cross-session profile. Solo: pick the team disposition, or "cast as a team".
const DISPOSITIONS = [
  { key: 'request', label: 'On request (neutral)' },
  { key: 'served', label: 'Forthcoming (trust earned)' },
  { key: 'guarded', label: 'Guarded (low trust)' },
  { key: 'surprise', label: 'Surprise — resolve from the CEO’s spine history' },
];

export function SessionSetup({
  scenarioId,
  mode,
  seats,
  people: people0,
  orgId,
}: {
  scenarioId: string;
  mode: 'solo' | 'team';
  seats: ScenarioSeatInfo[];
  people: PersonItem[];
  orgId: string | null;
}) {
  const router = useRouter();
  const [disposition, setDisposition] = useState('request');
  const [castAsTeam, setCastAsTeam] = useState(false);
  const [people, setPeople] = useState<PersonItem[]>(people0);
  const [assign, setAssign] = useState<Record<string, string>>({}); // seatKey → subjectId
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ sessionId: string; links: SessionLink[] } | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // which seats will be human (assignable)
  const humanSeats = useMemo(
    () => seats.filter((s) => mode === 'team' || castAsTeam || s.key === 'ceo'),
    [seats, mode, castAsTeam],
  );

  const addPerson = async (seatKey: string) => {
    if (!newName.trim() && !newEmail.trim()) return;
    const res = await createPerson({ name: newName || newEmail, email: newEmail || undefined, orgId });
    if (res.ok && res.id) {
      const p: PersonItem = { id: res.id, name: newName || newEmail, email: newEmail || null, runs: 0 };
      setPeople((ps) => (ps.some((x) => x.id === p.id) ? ps : [...ps, p]));
      setAssign((a) => ({ ...a, [seatKey]: res.id! }));
      setAddingFor(null);
      setNewName('');
      setNewEmail('');
    }
  };

  const create = async () => {
    setBusy(true);
    setErr('');
    const assignments = humanSeats.filter((s) => assign[s.key]).map((s) => ({ seatKey: s.key, subjectId: assign[s.key] }));
    const res = await createSession({
      scenarioId,
      disposition: mode === 'solo' ? disposition : undefined,
      castAsTeam: mode === 'solo' ? castAsTeam : undefined,
      assignments: assignments.length ? assignments : undefined,
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
          <button className="btn ghost" onClick={() => { setResult(null); setAssign({}); }}>Set up another</button>
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
          <span><b>Cast as a team</b> — every seat becomes a real player; the room deliberates and locks each weekly call together.</span>
        </label>
      ) : null}

      <div className="assign">
        <div className="assign-h">Assign people to seats <span className="db-dim">(optional — links their runs to their profile)</span></div>
        {humanSeats.map((s) => (
          <div className="assign-row" key={s.key}>
            <div className="assign-seat"><b>{s.name}</b> <span className="db-role">{s.role ?? s.key}</span></div>
            {addingFor === s.key ? (
              <div className="assign-add">
                <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                <input placeholder="Email (optional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <button className="btn primary" onClick={() => addPerson(s.key)} disabled={!newName.trim() && !newEmail.trim()}>Add</button>
                <button className="btn ghost" onClick={() => { setAddingFor(null); setNewName(''); setNewEmail(''); }}>Cancel</button>
              </div>
            ) : (
              <select
                value={assign[s.key] ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__add') { setAddingFor(s.key); return; }
                  setAssign((a) => ({ ...a, [s.key]: e.target.value }));
                }}
              >
                <option value="">Unassigned (anonymous)</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.email ? ` · ${p.email}` : ''}</option>)}
                <option value="__add">＋ Add a new person…</option>
              </select>
            )}
          </div>
        ))}
      </div>

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
