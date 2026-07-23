'use client';
import { useState } from 'react';
import { getSessionSetupInfo, type ScenarioOption, type SessionSetupInfo } from '@/lib/facilitator-actions';
import { SessionSetup } from '@/components/facilitator/SessionSetup';

// Facilitator quick-start: pick a scenario → the full Session Setup (casting + people
// assignment + links). Thin wrapper so the Sessions page and the Library share one flow.
export function NewSession({ scenarios }: { scenarios: ScenarioOption[] }) {
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

  if (!scenarios.length) return null;

  return (
    <div className="newsession">
      {!open ? (
        <button className="btn primary" onClick={() => { setOpen(true); if (scenarioId) pick(scenarioId); }}>
          + New session
        </button>
      ) : (
        <div className="ns-panel">
          <div className="ns-title">Start a session</div>
          <label className="ed-field ed-narrow">
            <span>Scenario</span>
            <select value={scenarioId} onChange={(e) => pick(e.target.value)}>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.title} · {s.mode} · {s.seats} seats</option>
              ))}
            </select>
          </label>
          {busy ? <p className="db-sub">Loading seats…</p> : info ? (
            <SessionSetup scenarioId={scenarioId} mode={info.mode} seats={info.seats} people={info.people} orgId={info.orgId} />
          ) : null}
          <div className="ns-actions" style={{ marginTop: 10 }}>
            <button className="btn ghost" onClick={() => { setOpen(false); setInfo(null); }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
