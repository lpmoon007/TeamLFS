'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ScenarioLibItem } from '@/lib/facilitator-actions';

// Scenario Library grid with a realism filter (all / realistic / abstract). Client-side so
// the filter is instant; the data is fetched server-side and passed in.
type Filter = 'all' | 'realistic' | 'abstract';

export function ScenarioLibraryView({ scenarios }: { scenarios: ScenarioLibItem[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = scenarios.filter((s) => filter === 'all' || s.realism === filter);
  const solo = shown.filter((s) => s.mode === 'solo');
  const team = shown.filter((s) => s.mode === 'team');
  const counts = {
    all: scenarios.length,
    realistic: scenarios.filter((s) => s.realism === 'realistic').length,
    abstract: scenarios.filter((s) => s.realism === 'abstract').length,
  };

  const Card = ({ s }: { s: ScenarioLibItem }) => (
    <Link href={`/facilitator/library/${s.id}`} className="lib-card">
      <div className="lib-card-top">
        <strong>{s.title}</strong>
        <span className={`cast-badge ${s.mode === 'solo' ? 'ai' : 'human'}`}>{s.mode}</span>
      </div>
      {s.summary ? <div className="lib-card-sub">{s.summary.slice(0, 120)}</div> : null}
      <div className="lib-card-meta">
        <span className={`realism-tag ${s.realism}`}>{s.realism}</span>
        <span>·</span>
        <span>{s.seats} seats</span>
        <span>·</span>
        <span>diff {s.difficulty}</span>
        {s.weekCount ? (<><span>·</span><span>{s.weekCount} wks</span></>) : null}
        {s.teamCastable ? (<><span>·</span><span className="lib-tc">team-castable</span></>) : null}
        <span>·</span>
        <span>{s.sessions} run{s.sessions === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );

  if (!scenarios.length) return <p className="db-sub">No scenarios seeded.</p>;

  return (
    <>
      <div className="lib-filter">
        {(['all', 'realistic', 'abstract'] as Filter[]).map((f) => (
          <button key={f} className={`lib-chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'realistic' ? 'Realistic' : 'Abstract'} <span className="lib-chip-n">{counts[f]}</span>
          </button>
        ))}
      </div>
      {solo.length ? (
        <>
          <div className="lib-section-h">Solo <span className="db-dim">({solo.length})</span></div>
          <div className="lib-grid">{solo.map((s) => <Card key={s.id} s={s} />)}</div>
        </>
      ) : null}
      {team.length ? (
        <>
          <div className="lib-section-h" style={{ marginTop: 26 }}>Team <span className="db-dim">({team.length})</span></div>
          <div className="lib-grid">{team.map((s) => <Card key={s.id} s={s} />)}</div>
        </>
      ) : null}
      {!solo.length && !team.length ? <p className="db-sub">No scenarios match that filter.</p> : null}
    </>
  );
}
