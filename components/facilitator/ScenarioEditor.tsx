'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateScenario } from '@/lib/facilitator-actions';

// Scenario editor — the safe, non-content metadata: title, summary, and the difficulty
// coefficient (normalizes the panel across scenarios). Authored content (weeks/holds/
// drivers) is regenerated from the prototype via the seed pipeline, so it's shown read-only
// in the structure panel rather than hand-edited here.
const MARKERS: { key: string; label: string }[] = [
  { key: 'A1', label: 'Information-seeking' },
  { key: 'A2', label: 'Decision calibration' },
  { key: 'A3', label: 'Consultation breadth' },
  { key: 'A4', label: 'Truth-seeking over comfort' },
  { key: 'A5', label: 'Intent–action integrity' },
  { key: 'A6', label: 'Composure under escalation' },
];

export function ScenarioEditor({
  scenarioId,
  title: title0,
  summary: summary0,
  difficulty: difficulty0,
  realism: realism0,
  stresses: stresses0 = [],
}: {
  scenarioId: string;
  title: string;
  summary: string | null;
  difficulty: number;
  realism: string;
  stresses?: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(title0);
  const [summary, setSummary] = useState(summary0 ?? '');
  const [difficulty, setDifficulty] = useState(String(difficulty0));
  const [realism, setRealism] = useState(realism0 === 'abstract' ? 'abstract' : 'realistic');
  const [stresses, setStresses] = useState<string[]>(stresses0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const toggle = (k: string) => setStresses((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const sameStresses = stresses.length === stresses0.length && stresses.every((k) => stresses0.includes(k));
  const dirty = title !== title0 || summary !== (summary0 ?? '') || difficulty !== String(difficulty0) || realism !== realism0 || !sameStresses;

  const save = async () => {
    setBusy(true);
    setFlash(null);
    const d = Number(difficulty);
    const res = await updateScenario({ scenarioId, title, summary, difficulty: isFinite(d) ? d : undefined, realism, stresses });
    setBusy(false);
    if (res.ok) { setFlash('Saved'); router.refresh(); }
    else setFlash(`Couldn’t save: ${res.reason ?? 'error'}`);
  };

  return (
    <div className="ed">
      <label className="ed-field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="ed-field">
        <span>Summary</span>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
      </label>
      <label className="ed-field ed-narrow">
        <span>Difficulty coefficient <span className="db-dim">(0.5–2.0 · normalizes the panel)</span></span>
        <input type="number" step="0.01" min="0.5" max="2" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
      </label>
      <label className="ed-field ed-narrow">
        <span>Realism <span className="db-dim">(setting band)</span></span>
        <select value={realism} onChange={(e) => setRealism(e.target.value)}>
          <option value="realistic">Realistic — a real-world org crisis</option>
          <option value="abstract">Abstract — an allegorical survival setting</option>
        </select>
      </label>
      <div className="ed-field">
        <span>Markers it presses <span className="db-dim">(drives the content-aware next-run recommendation)</span></span>
        <div className="ed-markers">
          {MARKERS.map((m) => (
            <label key={m.key} className={`ed-marker${stresses.includes(m.key) ? ' on' : ''}`}>
              <input type="checkbox" checked={stresses.includes(m.key)} onChange={() => toggle(m.key)} />
              <span className="ed-marker-k">{m.key}</span> {m.label}
            </label>
          ))}
        </div>
      </div>
      <div className="ed-actions">
        <button className="btn primary" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
        {flash ? <span className={`ed-flash${flash.startsWith('Couldn') ? ' err' : ''}`}>{flash}</span> : null}
      </div>
    </div>
  );
}
