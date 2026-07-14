import type { SeatTierB } from '@/lib/team-metrics';
import type { Divergence } from '@/lib/divergence';

// Per-seat teaming contribution (Tier B) + the person's cross-session divergence quadrant,
// on the facilitator game-film. Tier B is THIS session's contribution; the quadrant pairs
// their teaming (team runs) with their executive judgment (solo runs) across sessions.

function ordinalQuad(q: string): { label: string; hint: string } {
  switch (q) {
    case 'multiplier': return { label: 'Multiplier', hint: 'sharp calls + lifts the room' };
    case 'lone_genius': return { label: 'Lone Genius', hint: 'strong judgment, not yet contagious' };
    case 'connector': return { label: 'Connector', hint: 'lifts the room, judgment still sharpening' };
    case 'struggling': return { label: 'Still forming', hint: 'both axes still developing' };
    default: return { label: '—', hint: '' };
  }
}

export function SeatTierBPanel({ tierB, divergence }: { tierB: SeatTierB | null; divergence: Divergence | null }) {
  const exercised = tierB?.markers.filter((m) => m.exercised) ?? [];
  return (
    <section className="db-panel">
      <h2>Teaming contribution (Tier B)</h2>
      <p className="db-sub">
        How this person contributed to the team as a unit this session — a per-person read, distinct from the room-level
        board. Markers with no opportunity this session are marked not exercised.
      </p>
      {tierB && tierB.tierB !== null ? (
        <div className="tb-vital" style={{ marginBottom: 14 }}>
          <div className="tb-vital-top">
            <b>Tier B composite</b>
            <span className="tb-sc">{tierB.tierB}<span className="tb-sc-max"> / 100</span></span>
          </div>
          <div className="tb-bar"><div className="tb-fill" style={{ width: `${tierB.tierB}%` }} /></div>
        </div>
      ) : (
        <p className="db-dim" style={{ marginBottom: 14 }}>No teaming signal captured for this seat this session.</p>
      )}
      <div className="db-traits">
        {(tierB?.markers ?? []).map((m) => (
          <div className="db-trait" key={m.key}>
            <span className="db-trait-key">{m.label}</span>
            <span className="db-trait-val">{m.exercised && m.normalized !== null ? `${m.normalized} / 100` : '—'}</span>
            <span className="db-conf">{m.exercised ? `${m.confidence} confidence` : 'not exercised'}</span>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 22 }}>Divergence — judgment × teaming</h2>
      {divergence && divergence.quadrant !== 'na' ? (
        <>
          <div className="dq">
            <div className="dq-grid" aria-hidden>
              <div className="dq-cell">Connector</div>
              <div className="dq-cell hi">Multiplier</div>
              <div className="dq-cell">Still forming</div>
              <div className="dq-cell">Lone Genius</div>
              <div className="dq-dot" style={{ left: `${divergence.tierA ?? 0}%`, bottom: `${divergence.tierB ?? 0}%` }} />
            </div>
            <div className="dq-read">
              <div className="dq-label">{ordinalQuad(divergence.quadrant).label}</div>
              <div className="dq-scores">
                Judgment <b>{divergence.tierA}</b> ({divergence.soloRuns} solo) · Teaming <b>{divergence.tierB}</b> ({divergence.teamRuns} team)
              </div>
              <p>{divergence.read}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="db-sub">
          {divergence
            ? divergence.teamRuns === 0
              ? 'This person has no scored team run yet — the teaming axis unlocks once they play one.'
              : divergence.soloRuns === 0
                ? 'This person has no scored solo run yet — the judgment axis unlocks once they play one.'
                : 'Both axes need a run to place them.'
            : 'No cross-session identity resolved for this seat (needs a stable email/name).'}
        </p>
      )}
    </section>
  );
}
