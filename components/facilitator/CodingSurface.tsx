'use client';
import Link from 'next/link';
import { useState } from 'react';
import { submitHumanScore, type CodingTask, type CodingTrait } from '@/lib/facilitator-actions';

// Human coding surface (Behavioral Memory Spine §3.3). A trained coder scores each trait
// from the SAME cited Layer-1 evidence the AI read — coded BLIND (the AI's answer stays
// hidden until they've saved) so inter-rater agreement isn't inflated by anchoring. The
// re-score harness's compare then yields real AI-vs-human reliability.
export function CodingSurface({ task, keyParam }: { task: CodingTask; keyParam: string }) {
  const session = task.session!;
  const p = task.participant!;
  const idx = task.roster.findIndex((r) => r.participantId === p.id);
  const nextP = task.roster[(idx + 1) % task.roster.length];

  const coded = task.traits.filter((t) => t.human).length;

  return (
    <div className="debrief coding">
      <header className="db-head">
        <div className="db-crumb">
          <Link href={`/facilitator/debrief/${session.id}${keyParam}`}>Team</Link> ▸{' '}
          <Link href={`/facilitator/debrief/${session.id}/${p.seatKey}${keyParam}`}>{p.name}</Link> ▸ <strong>Code</strong>
        </div>
        <div className="film-id">
          <h1>Code · {p.name}</h1>
          <span className="db-role">{p.role}</span>
          <div className="spacer" />
          <span className="db-role">
            {coded}/{task.traits.length} coded
          </span>
          {nextP && nextP.participantId !== p.id ? (
            <Link className="btn ghost" href={`/facilitator/code/${session.id}/${nextP.participantId}${keyParam}`}>
              Next: {nextP.name.split(' ')[0]} ›
            </Link>
          ) : null}
          <Link className="btn" href={`/facilitator/debrief/${session.id}/${p.seatKey}${keyParam}`}>
            Back to game-film
          </Link>
        </div>
      </header>

      <p className="db-sub coding-intro">
        Score each dynamic from the cited evidence only. Code <b>blind</b> — the AI’s score stays hidden until you save,
        so your judgment is independent. Your rows are stored as <code>coder=human</code>; the reliability read compares
        them to the AI coder.
      </p>

      {task.reliability && task.reliability.agreement ? (
        <div className="coding-reliability">
          <span className="db-role">AI vs human (session)</span>
          <b className="rel-big">{task.reliability.agreement.poleAgreementPct ?? '—'}%</b> pole agreement over{' '}
          <b>{task.reliability.agreement.comparablePairs}</b> pairs · mean |Δ| {task.reliability.agreement.meanAbsDelta ?? '—'}
          <span className="db-dim"> · {task.reliability.bRows} human / {task.reliability.aRows} AI rows</span>
        </div>
      ) : (
        <div className="coding-reliability db-dim">
          No AI-vs-human comparison yet — save at least one code (and ensure the AI scorer has run) to see agreement.
        </div>
      )}

      <div className="coding-list">
        {task.traits.map((t) => (
          <TraitCard key={t.trait_key} sessionId={session.id} participantId={p.id} trait={t} />
        ))}
      </div>
    </div>
  );
}

function TraitCard({ sessionId, participantId, trait }: { sessionId: string; participantId: string; trait: CodingTrait }) {
  const [valueNum, setValueNum] = useState<number>(trait.human?.value_num ?? 0);
  const [confidence, setConfidence] = useState<number>(trait.human?.confidence ?? 0.5);
  const [note, setNote] = useState<string>(trait.human?.note ?? '');
  const [saved, setSaved] = useState<boolean>(!!trait.human);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);

  const pole = confidence === 0 ? '—' : valueNum > 0.2 ? trait.poles.positive : valueNum < -0.2 ? trait.poles.negative : trait.poles.neutral;

  const save = async () => {
    setBusy(true);
    const res = await submitHumanScore({ sessionId, participantId, traitKey: trait.trait_key, valueNum, confidence, note });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setReveal(true); // reveal the AI's answer only after an independent judgment is recorded
    }
  };

  return (
    <div className="coding-card">
      <div className="coding-head">
        <div>
          <span className="coding-key">{trait.trait_key}</span>
          <span className="db-hyp">{trait.status}</span>
        </div>
        <div className="coding-poles">
          <span className="pole neg">−1 {trait.poles.negative}</span>
          <span className="pole neu">0 {trait.poles.neutral}</span>
          <span className="pole pos">+1 {trait.poles.positive}</span>
        </div>
      </div>
      <p className="coding-def">{trait.definition}</p>
      <div className="coding-signals">
        {trait.observable_signals.map((s, i) => (
          <span key={i} className="coding-signal">
            {s}
          </span>
        ))}
      </div>

      <div className="coding-evidence">
        <div className="db-role">Cited evidence ({trait.evidence.length})</div>
        {trait.evidence.length === 0 ? (
          <div className="db-dim">No events cited for this trait — score from absence (an omission is evidence too).</div>
        ) : (
          <ul className="coding-ev-list">
            {trait.evidence.map((e) => (
              <li key={e.id} className={`coding-ev${e.derived ? ' derived' : ''}`}>
                <span className="db-type">{e.derived ? 'OMISSION' : e.type}</span>
                {e.target ? <span className="db-target">→ {e.target}</span> : null}
                {e.body ? <span className="db-preview">“{e.body}”</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="coding-inputs">
        <label>
          <span>
            Posture <b>{valueNum.toFixed(2)}</b> → <b className="coding-pole-out">{pole}</b>
          </span>
          <input type="range" min={-1} max={1} step={0.05} value={valueNum} onChange={(e) => setValueNum(parseFloat(e.target.value))} />
        </label>
        <label>
          <span>
            Confidence <b>{Math.round(confidence * 100)}%</b>
          </span>
          <input type="range" min={0} max={1} step={0.05} value={confidence} onChange={(e) => setConfidence(parseFloat(e.target.value))} />
        </label>
        <textarea placeholder="Rationale (why this posture, from which evidence)…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="coding-actions">
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : saved ? 'Update' : 'Save code'}
          </button>
          {saved ? <span className="coding-saved">✓ recorded</span> : null}
        </div>
      </div>

      {reveal || (saved && trait.ai) ? (
        <div className="coding-ai">
          {trait.ai ? (
            <>
              <span className="db-role">AI coder</span> judged{' '}
              <b>
                {trait.ai.value ?? '—'}
                {trait.ai.value_num != null ? ` (${trait.ai.value_num.toFixed(2)})` : ''}
              </b>{' '}
              at {Math.round(trait.ai.confidence * 100)}% <span className="db-hyp">{trait.ai.scorer_version}</span>
              {trait.ai.value_num != null && confidence > 0 ? (
                <span className={`coding-agree ${poleMatch(trait, valueNum) ? 'ok' : 'no'}`}>
                  {poleMatch(trait, valueNum) ? 'agrees with your pole' : 'disagrees with your pole'}
                </span>
              ) : null}
            </>
          ) : (
            <span className="db-dim">No AI score on file — run the scorer (finalize / re-score) to compare.</span>
          )}
        </div>
      ) : trait.ai ? (
        <button className="coding-reveal" onClick={() => setReveal(true)}>
          Reveal AI score (only after you’ve judged) →
        </button>
      ) : null}
    </div>
  );
}

function poleMatch(trait: CodingTrait, valueNum: number): boolean {
  const humanPole = valueNum > 0.2 ? trait.poles.positive : valueNum < -0.2 ? trait.poles.negative : trait.poles.neutral;
  return trait.ai?.value === humanPole;
}
