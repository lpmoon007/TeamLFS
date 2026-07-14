import Link from 'next/link';
import { facilitatorAllowed } from '@/lib/facilitator-session';
import { buildDebrief, type DebriefEvent } from '@/lib/debrief';
import { applyLens } from '@/lib/lens/ldol';
import { lensHistoryForParticipant, subjectForParticipant } from '@/lib/spine';
import { participantTierB } from '@/lib/team-panel';
import { subjectDivergence, type Divergence } from '@/lib/divergence';
import { createAdminClient } from '@/lib/supabase/admin';
import { Notice } from '@/components/Notice';
import { SeatTierBPanel } from '@/components/facilitator/SeatTierBPanel';

// Game-film — the "coaching" altitude (Build Addendum A2). One participant's reel:
// their footage (acts, un-sent drafts, silences, who they didn't contact), the LDOL
// disciplines + 2Q (a versioned lens over the trait layer), and trait scores. Same
// dataset as the team view; drilled in. Breadcrumb + ‹/› cross-participant paging.
export default async function GameFilmPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string; seatId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { sessionId, seatId } = await params;
  const { key } = await searchParams;
  if (!(await facilitatorAllowed(key))) {
    return <Notice title="Not found" message="This debrief link is invalid." />;
  }
  const d = await buildDebrief(sessionId);
  if (!d) return <Notice title="Session not found" message="No session with that id." />;

  const idx = d.participants.findIndex((p) => p.seatKey === seatId);
  if (idx === -1) return <Notice title="Seat not found" message="No such participant in this session." />;
  const p = d.participants[idx]!;
  const kp = key ? `?key=${encodeURIComponent(key)}` : '';
  const prev = d.participants[(idx - 1 + d.participants.length) % d.participants.length]!;
  const next = d.participants[(idx + 1) % d.participants.length]!;

  // Layer-3 LDOL lens — a versioned read OVER the trait layer (not raw counts). The
  // Learning discipline reads this person's cross-session posture (Phase 9).
  const db = createAdminClient();
  const history = await lensHistoryForParticipant(db, sessionId, p.participantId);
  const ldol = applyLens({ traits: p.traits, omissions: { count: p.counts.omissions }, history });

  // Tier B (this session's teaming contribution) + cross-session divergence quadrant.
  const tierB = await participantTierB(sessionId, p.participantId);
  const subjectId = await subjectForParticipant(db, sessionId, p.participantId);
  const divergence: Divergence | null = subjectId ? await subjectDivergence(db, subjectId) : null;

  return (
    <div className="debrief film">
      <header className="db-head">
        <div className="db-crumb">
          <Link href={`/facilitator/debrief/${sessionId}${kp}`}>Team</Link> ▸ <strong>{p.name}</strong>
          <span className="db-lens"> · Lens: {ldol.version}</span>
        </div>
        <div className="film-id">
          <span className={`flag ${p.flag}`} />
          <h1>{p.name}</h1>
          <span className="db-role">{p.role}</span>
          <div className="spacer" />
          <Link className="btn ghost" href={`/facilitator/debrief/${sessionId}/${prev.seatKey}${kp}`}>
            ‹ {prev.name.split(' ')[0]}
          </Link>
          <Link className="btn ghost" href={`/facilitator/debrief/${sessionId}/${next.seatKey}${kp}`}>
            {next.name.split(' ')[0]} ›
          </Link>
          <Link className="btn" href={`/facilitator/debrief/${sessionId}${kp}`}>
            Back to team
          </Link>
        </div>
      </header>

      <div className="film-grid">
        <section className="db-panel">
          <h2>LDOL read · {ldol.version}</h2>
          <p className="db-sub">A versioned lens over the trait layer — a reading, not a verdict. Swap the lens without touching the engine or the log.</p>
          <div className="ldol">
            {ldol.disciplines.map((disc) => (
              <div className={`ldol-row sig-${disc.signal}`} key={disc.name}>
                <div className="ldol-top">
                  <span className="ldol-name">{disc.name}</span>
                  <span className="ldol-frame">{disc.frame}</span>
                  <span className={`ldol-sig ${disc.signal}`}>{disc.signal}</span>
                </div>
                <div className="ldol-read">{disc.read}</div>
                {disc.traits.length ? (
                  <div className="ldol-traits">
                    {disc.traits.map((t) => (
                      <span key={t.trait_key} className="ldol-trait" title={`${Math.round(t.confidence * 100)}% · ${t.evidence} ev`}>
                        {t.label}: {t.pole ?? '—'}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="twoq">
            <div>
              <span className="twoq-q">What are you building?</span>
              {ldol.building.length ? (
                <ul className="twoq-list">{ldol.building.map((b, i) => <li key={i}>{b}</li>)}</ul>
              ) : (
                <span className="twoq-a db-dim">Not enough confident evidence this session.</span>
              )}
            </div>
            <div>
              <span className="twoq-q">What are you allowing?</span>
              {ldol.allowing.length ? (
                <ul className="twoq-list">{ldol.allowing.map((a, i) => <li key={i}>{a}</li>)}</ul>
              ) : (
                <span className="twoq-a db-dim">Nothing flagged this session.</span>
              )}
            </div>
          </div>

          <div className="db-traits-head">
            <h2 style={{ marginTop: 22 }}>Trait scores (v0.1 — hypothesis)</h2>
            <Link className="btn ghost" href={`/facilitator/code/${sessionId}/${p.participantId}${kp}`}>
              Code these traits →
            </Link>
          </div>
          <div className="db-traits">
            {p.traits.map((t) => (
              <div className="db-trait" key={t.trait_key} title={t.definition ?? ''}>
                <span className="db-trait-key">{t.trait_key}</span>
                <span className="db-trait-val">
                  {t.value ?? '—'}
                  {t.value_num != null ? ` (${t.value_num.toFixed(2)})` : ''}
                </span>
                <span className="db-conf">
                  conf {Math.round(t.confidence * 100)}% · {t.evidence_event_ids.length} ev
                </span>
                <span className="db-hyp">{t.status}</span>
              </div>
            ))}
          </div>
        </section>

        <SeatTierBPanel tierB={tierB} divergence={divergence} subjectId={subjectId} keyParam={kp} />

        <section className="db-panel">
          <h2>The footage</h2>
          <p className="db-sub">
            Every act and omission from T=0 — including un-sent drafts and ignored threads
            (amber). {p.latencyMs.avg != null ? `Avg response ${Math.round(p.latencyMs.avg / 1000)}s.` : ''}
          </p>
          <ol className="db-timeline film-tl">
            {p.timeline.length === 0 ? (
              <li className="db-dim">No footage.</li>
            ) : (
              p.timeline.map((e) => <FilmRow key={e.id} e={e} />)
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}

function FilmRow({ e }: { e: DebriefEvent }) {
  return (
    <li className={`db-ev${e.derived ? ' derived' : ''}`}>
      <span className="db-t">{fmtRel(e.rel_ms)}</span>
      <span className="db-type">{e.type}</span>
      {e.target ? <span className="db-target">→ {e.target}</span> : null}
      {e.preview ? <span className="db-preview">“{e.preview}”</span> : null}
    </li>
  );
}

function fmtRel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
