import { facilitatorSecret } from '@/lib/env';
import { buildDebrief, type DebriefEvent } from '@/lib/debrief';
import { Notice } from '@/components/Notice';

// Minimal human-readable debrief (Phase 7). Gated by the facilitator secret passed
// as ?key= (a minimal internal tool; the real facilitator auth + dashboard is Phase 8).
//   /facilitator/debrief/<sessionId>?key=<FACILITATOR_SECRET>
export default async function DebriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { sessionId } = await params;
  const { key } = await searchParams;

  let expected = '';
  try {
    expected = facilitatorSecret();
  } catch {
    return <Notice title="Debrief unavailable" message="FACILITATOR_SECRET is not configured on the server." />;
  }
  if (!key || key !== expected) {
    return <Notice title="Not found" message="This debrief link is invalid." />;
  }

  const d = await buildDebrief(sessionId);
  if (!d) return <Notice title="Session not found" message="No session with that id." />;

  return (
    <div className="debrief">
      <header className="db-head">
        <div className="wm">
          IN<span>COMMAND</span> · DEBRIEF
        </div>
        <h1>{d.scenario?.title ?? 'Session'}</h1>
        <div className="db-meta">
          Status: {d.session.status} · Started: {fmtClock(d.session.started_at)}
          {d.session.ended_at ? ` · Ended: ${fmtClock(d.session.ended_at)}` : ''} ·{' '}
          {d.participants.length} participants
        </div>
      </header>

      <section className="db-panel">
        <h2>The first move</h2>
        <p className="db-sub">
          Who did each person contact first, and when — the single most diagnostic column.
        </p>
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th>Seat</th>
                <th>First action</th>
                <th>First message → to</th>
                <th>At</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Emails read</th>
                <th>Calls</th>
                <th>Omissions</th>
                <th>Avg latency</th>
              </tr>
            </thead>
            <tbody>
              {d.participants.map((p) => (
                <tr key={p.participantId}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="db-role">{p.role}</div>
                  </td>
                  <td>{p.firstEvent ? `${p.firstEvent.type} @ ${fmtRel(p.firstEvent.rel_ms)}` : '—'}</td>
                  <td>{p.firstMessageTo ? p.firstMessageTo.target : <span className="db-dim">never</span>}</td>
                  <td>{p.firstMessageTo ? fmtRel(p.firstMessageTo.rel_ms) : '—'}</td>
                  <td>{p.counts.sent}</td>
                  <td>{p.counts.opened}</td>
                  <td>{p.counts.emailsRead}</td>
                  <td>{p.counts.calls}</td>
                  <td>{p.counts.omissions > 0 ? <span className="db-warn">{p.counts.omissions}</span> : 0}</td>
                  <td>{p.latencyMs.avg != null ? fmtDur(p.latencyMs.avg) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="db-panel">
        <h2>Trait scores (v0.1 — hypothesis)</h2>
        <p className="db-sub">{d.scorerNote}</p>
        <div className="db-grid">
          {d.participants.map((p) => (
            <div className="db-card" key={p.participantId}>
              <div className="db-card-head">
                <strong>{p.name}</strong>
                <span className="db-role">{p.role}</span>
              </div>
              <div className="db-traits">
                {p.traits.map((t) => (
                  <div className="db-trait" key={t.trait_key} title={t.definition ?? ''}>
                    <span className="db-trait-key">{t.trait_key}</span>
                    <span className="db-trait-val">
                      {t.value ?? '—'}
                      {t.value_num != null ? ` (${t.value_num.toFixed(2)})` : ''}
                    </span>
                    <span className="db-conf" title="confidence">
                      conf {Math.round(t.confidence * 100)}% · {t.evidence_event_ids.length} ev
                    </span>
                    <span className="db-hyp">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="db-panel">
        <h2>Timelines</h2>
        <p className="db-sub">Every logged act and omission, per participant, from T=0.</p>
        <div className="db-grid">
          {d.participants.map((p) => (
            <div className="db-card" key={p.participantId}>
              <div className="db-card-head">
                <strong>{p.name}</strong>
                <span className="db-role">{p.role}</span>
              </div>
              <ol className="db-timeline">
                {p.timeline.length === 0 ? (
                  <li className="db-dim">No events.</li>
                ) : (
                  p.timeline.map((e) => <TimelineRow key={e.id} e={e} />)
                )}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TimelineRow({ e }: { e: DebriefEvent }) {
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
  if (!isFinite(ms)) return '—';
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
function fmtDur(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}
function fmtClock(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
