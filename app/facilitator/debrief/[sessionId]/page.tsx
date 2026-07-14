import Link from 'next/link';
import { facilitatorAllowed } from '@/lib/facilitator-session';
import { buildDebrief } from '@/lib/debrief';
import { buildTeamPanel } from '@/lib/team-panel';
import { isSoloSession, buildSoloDebriefForFacilitator } from '@/lib/solo-debrief';
import { Notice } from '@/components/Notice';
import { CommsMap } from '@/components/facilitator/CommsMap';
import { TeamPanel } from '@/components/facilitator/TeamPanel';
import { TeamDirectorChat } from '@/components/facilitator/TeamDirectorChat';
import { SoloDebriefView } from '@/components/solo/SoloDebrief';

// Team debrief — the "discussion" altitude (Build Addendum A2). The communication
// map + per-person cards, all a read of the one session dataset. Drill into a person
// → the game-film view. Gated by facilitator cookie OR ?key=.
export default async function TeamDebriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { sessionId } = await params;
  const { key } = await searchParams;
  if (!(await facilitatorAllowed(key))) {
    return <Notice title="Not found" message="This debrief link is invalid." />;
  }

  // Solo runs get the individual game-film debrief (Phase 5), facilitator-gated.
  if (await isSoloSession(sessionId)) {
    const res = await buildSoloDebriefForFacilitator(sessionId);
    if (!res.ok) {
      return <Notice title="No debrief yet" message="This solo run has no decisions to debrief." />;
    }
    return (
      <div className="soloui">
        <div className="stage">
          <div id="main">
            <SoloDebriefView d={res.debrief} />
          </div>
        </div>
      </div>
    );
  }

  const d = await buildDebrief(sessionId);
  if (!d) return <Notice title="Session not found" message="No session with that id." />;
  const panel = await buildTeamPanel(sessionId);

  const kp = key ? `?key=${encodeURIComponent(key)}` : '';

  return (
    <div className="debrief">
      <header className="db-head">
        <div className="db-crumb">
          <strong>Team</strong>
        </div>
        <h1>{d.scenario?.title ?? 'Session'}</h1>
        <div className="db-meta">
          {d.session.status} · {d.participants.length} participants ·{' '}
          <span className="db-lens">Lens: {d.lens}</span> ·{' '}
          <Link href={`/facilitator/debrief/${sessionId}/wall${kp}`}>Open One Wall ↗</Link>
        </div>
      </header>

      <section className="db-panel db-team">
        <div>
          <h2>Who spoke to whom</h2>
          <p className="db-sub">
            Blue = they actually spoke. Ring colour = flag (good / watch / warn). Click a
            person to drill into their game-film. Amber “never happened” edges are on the
            One Wall reveal.
          </p>
          <CommsMap team={d.team} sessionId={sessionId} keyParam={kp} reveal="always" />
        </div>
        <div className="db-gaps">
          <h2>What the team knew but didn’t surface</h2>
          {d.team.unaddressed.length === 0 ? (
            <p className="db-sub">Nothing flagged unaddressed.</p>
          ) : (
            <ul className="db-chips">
              {d.team.unaddressed.map((u, i) => (
                <li key={i} className="db-chip">
                  <strong>{u.seat}</strong> ignored <em>{u.contact ?? 'a thread'}</em>
                  {u.preview ? <span className="db-chip-prev">“{u.preview}”</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {panel ? <TeamPanel panel={panel} /> : null}

      <section className="db-panel">
        <h2>Ask the Director about the room</h2>
        <p className="db-sub">
          The Director watched the whole session. Ask why any team vital read the way it did, who carried the room, or what
          the team’s biggest miss was — it has the communication map and the Tier-B evidence in front of it.
        </p>
        <TeamDirectorChat sessionId={sessionId} chips={teamChips(panel)} />
      </section>

      <section className="db-panel">
        <h2>The team</h2>
        <div className="db-grid">
          {d.participants.map((p) => (
            <Link key={p.participantId} href={`/facilitator/debrief/${sessionId}/${p.seatKey}${kp}`} className="db-card db-link">
              <div className="db-card-head">
                <span>
                  <span className={`flag ${p.flag}`} /> <strong>{p.name}</strong>
                </span>
                <span className="db-role">{p.role}</span>
              </div>
              <div className="db-mini">
                First move:{' '}
                {p.firstMessageTo ? (
                  <>
                    → {p.firstMessageTo.target} @ {fmtRel(p.firstMessageTo.rel_ms)}
                  </>
                ) : (
                  <span className="db-dim">never messaged</span>
                )}
              </div>
              <div className="db-mini db-dim">
                sent {p.counts.sent} · opened {p.counts.opened} · calls {p.counts.calls}
                {p.counts.omissions > 0 ? <span className="db-warn"> · {p.counts.omissions} omissions</span> : null}
              </div>
              <div className="db-drill">Open game-film →</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function fmtRel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Director quick-chips seeded from the board: the weakest exercised vital + any that
// didn't get instrumented this session (so the facilitator can ask why).
function teamChips(panel: Awaited<ReturnType<typeof buildTeamPanel>>): string[] {
  if (!panel) return [];
  const metrics = Object.values(panel.metrics);
  const exercised = metrics.filter((m) => m.exercised && m.score !== null).sort((a, b) => (a.score as number) - (b.score as number));
  const na = metrics.find((m) => !m.exercised);
  const chips: string[] = [];
  if (exercised[0]) chips.push(`Why did ${exercised[0].label.toLowerCase()} read low?`);
  if (na) chips.push(`Why wasn’t ${na.label.toLowerCase()} measured this session?`);
  return chips;
}
