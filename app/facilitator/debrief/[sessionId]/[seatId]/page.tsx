import Link from 'next/link';
import { facilitatorAllowed } from '@/lib/facilitator-session';
import { buildDebrief, type DebriefEvent, type DebriefParticipant } from '@/lib/debrief';
import { Notice } from '@/components/Notice';

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
  const ldol = ldolRead(p);

  return (
    <div className="debrief film">
      <header className="db-head">
        <div className="db-crumb">
          <Link href={`/facilitator/debrief/${sessionId}${kp}`}>Team</Link> ▸ <strong>{p.name}</strong>
          <span className="db-lens"> · Lens: {d.lens}</span>
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
          <h2>LDOL read (v1)</h2>
          <p className="db-sub">A versioned lens over the trait layer — not a verdict. The 2Q reads the omission log.</p>
          <div className="ldol">
            {ldol.disciplines.map((disc) => (
              <div className="ldol-row" key={disc.name}>
                <span className="ldol-name">{disc.name}</span>
                <span className="ldol-read">{disc.read}</span>
              </div>
            ))}
          </div>
          <div className="twoq">
            <div>
              <span className="twoq-q">What are you building?</span>
              <span className="twoq-a">{ldol.building}</span>
            </div>
            <div>
              <span className="twoq-q">What are you allowing?</span>
              <span className="twoq-a">{ldol.allowing}</span>
            </div>
          </div>

          <h2 style={{ marginTop: 22 }}>Trait scores (v0.1 — hypothesis)</h2>
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

// v1 heuristic LDOL read — clearly a lens, computed from counts. Not validated.
function ldolRead(p: DebriefParticipant) {
  const decision = p.firstMessageTo
    ? `Committed at ${fmtRel(p.firstMessageTo.rel_ms)} → ${p.firstMessageTo.target}`
    : 'Never opened a decision — no message sent';
  const rhythm =
    p.counts.sent + p.counts.opened >= 6 ? 'Steady engagement across threads' : 'Sparse engagement';
  const standard = p.counts.omissions > 0 ? `${p.counts.omissions} things left unaddressed` : 'Closed the loops it opened';
  return {
    disciplines: [
      { name: 'Decision', read: decision },
      { name: 'Rhythm', read: rhythm },
      { name: 'Standard', read: standard },
      { name: 'Learning', read: 'Requires cross-session history (Horizon 2)' },
    ],
    building: p.counts.sent > 0 ? `Contact with ${p.counts.sent} message(s) sent` : 'Little visible initiative',
    allowing:
      p.counts.omissions > 0
        ? `${p.counts.omissions} unaddressed item(s) — see amber footage`
        : 'No obvious omissions this session',
  };
}

function fmtRel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
