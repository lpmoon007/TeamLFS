'use client';
import { useState } from 'react';
import { getSessionSetupInfo, type ScenarioOption, type SessionSetupInfo } from '@/lib/facilitator-actions';
import { SessionSetup } from '@/components/facilitator/SessionSetup';

// Start a session from a person's profile — the natural "I want Colin to test this" flow.
// Pick a scenario; the person is pre-assigned to the lead seat (CEO, else the first seat),
// then the full Session Setup takes over (cast-as-team, other seats, links).
export function StartSessionForPerson({ subjectId, name, scenarios }: { subjectId: string; name: string; scenarios: ScenarioOption[] }) {
  const [open, setOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const [info, setInfo] = useState<SessionSetupInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (id: string) => {
    setScenarioId(id);
    setInfo(null);
    if (!id) return;
    setBusy(true);
    setInfo(await getSessionSetupInfo(id));
    setBusy(false);
  };

  const leadSeat = info ? (info.seats.find((s) => s.key === 'ceo')?.key ?? info.seats[0]?.key) : undefined;
  const initialAssign = leadSeat ? { [leadSeat]: subjectId } : undefined;

  if (!scenarios.length) return <p className="db-sub">No scenarios seeded.</p>;

  return (
    <div>
      {!open ? (
        <button className="btn primary" onClick={() => { setOpen(true); if (scenarioId) pick(scenarioId); }}>
          Start a session with {name.split(' ')[0]}
        </button>
      ) : (
        <>
          <label className="ed-field ed-narrow">
            <span>Scenario</span>
            <select value={scenarioId} onChange={(e) => pick(e.target.value)}>
              {scenarios.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.mode} · {s.seats} seats</option>)}
            </select>
          </label>
          <p className="db-sub">{name} is pre-assigned to the lead seat. Adjust below, then create.</p>
          {busy ? <p className="db-sub">Loading seats…</p> : info ? (
            <SessionSetup key={scenarioId} scenarioId={scenarioId} mode={info.mode} seats={info.seats} people={info.people} orgId={info.orgId} initialAssign={initialAssign} />
          ) : null}
        </>
      )}
    </div>
  );
}
