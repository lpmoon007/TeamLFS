import Link from 'next/link';
import { isFacilitatorSession, facilitator } from '@/lib/facilitator-session';
import { getScenarioDetail, listPeople } from '@/lib/facilitator-actions';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { FacilitatorNav } from '@/components/facilitator/FacilitatorNav';
import { ScenarioEditor } from '@/components/facilitator/ScenarioEditor';
import { SessionSetup } from '@/components/facilitator/SessionSetup';
import { Notice } from '@/components/Notice';

// Admin — a single scenario: Session Setup (cast + launch) + Editor (metadata) + the
// authored structure (read model). Session Setup and Scenario Editor, connected under
// the scenario they act on.
export default async function ScenarioDetailPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  if (!(await isFacilitatorSession())) return <FacilitatorLogin />;
  const { scenarioId } = await params;
  const [d, me] = await Promise.all([getScenarioDetail(scenarioId), facilitator()]);
  const people = d ? await listPeople(d.orgId) : [];
  if (!d) {
    return (
      <div className="fac-shell">
        <FacilitatorNav user={me} />
        <div className="fac"><Notice title="Not found" message="No scenario with that id." /></div>
      </div>
    );
  }

  return (
    <div className="fac-shell">
      <FacilitatorNav user={me} />
      <div className="fac">
        <header className="fac-head">
          <div className="wm">IN<span>COMMAND</span> · SCENARIO</div>
          <div className="spacer" />
          <LogoutButton />
        </header>
        <div className="fac-body">
          <div className="db-crumb" style={{ marginBottom: 8 }}>
            <Link href="/facilitator/library">Scenario Library</Link> ▸ <strong>{d.title}</strong>
          </div>
          <div className="fac-body-top">
            <h1>{d.title} <span className={`cast-badge ${d.mode === 'solo' ? 'ai' : 'human'}`}>{d.mode}</span></h1>
          </div>

          <div className="sc-grid">
            <section className="db-panel">
              <h2>Set up a session</h2>
              <p className="db-sub">Cast this scenario, assign people, and generate per-seat links.</p>
              <SessionSetup scenarioId={d.id} mode={d.mode} seats={d.seatsList} people={people} orgId={d.orgId} />
            </section>

            <section className="db-panel">
              <h2>Edit</h2>
              <p className="db-sub">Title, summary, and difficulty. Authored content is regenerated from the seed pipeline.</p>
              <ScenarioEditor scenarioId={d.id} title={d.title} summary={d.summary} difficulty={d.difficulty} />
            </section>
          </div>

          <section className="db-panel">
            <h2>Structure <span className="db-dim" style={{ fontSize: 12, fontWeight: 400 }}>(read model)</span></h2>
            <div className="sc-facts">
              <div className="sc-fact"><span className="sc-fact-n">{d.seatsList.length}</span><span className="sc-fact-l">seats</span></div>
              <div className="sc-fact"><span className="sc-fact-n">{d.weekCount ?? '—'}</span><span className="sc-fact-l">weeks</span></div>
              <div className="sc-fact"><span className="sc-fact-n">{d.weekSeconds ?? '—'}</span><span className="sc-fact-l">sec / week</span></div>
              <div className="sc-fact"><span className="sc-fact-n">{d.weeks.reduce((a, w) => a + w.holds, 0)}</span><span className="sc-fact-l">holds</span></div>
              <div className="sc-fact"><span className="sc-fact-n">{d.weeks.reduce((a, w) => a + w.criticalHolds, 0)}</span><span className="sc-fact-l">critical</span></div>
            </div>

            <div className="sc-cols">
              <div>
                <div className="sc-sub-h">Seats</div>
                <div className="sc-list">
                  {d.seatsList.map((s) => (
                    <div className="sc-row" key={s.key}><b>{s.name}</b> <span className="db-role">{s.role ?? s.key}</span></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="sc-sub-h">Drivers</div>
                <div className="sc-chips">{d.drivers.length ? d.drivers.map((x) => <span className="sc-chip" key={x.key}>{x.label}</span>) : <span className="db-dim">—</span>}</div>
                <div className="sc-sub-h" style={{ marginTop: 14 }}>Dimensions</div>
                <div className="sc-chips">{d.dimensions.length ? d.dimensions.map((x) => <span className="sc-chip" key={x.key}>{x.label}</span>) : <span className="db-dim">—</span>}</div>
              </div>
            </div>

            {d.weeks.length ? (
              <>
                <div className="sc-sub-h" style={{ marginTop: 16 }}>Weeks</div>
                <div className="sc-weeks">
                  {d.weeks.map((w) => (
                    <div className="sc-week" key={w.n}>
                      <div className="sc-week-top"><b>Week {w.n} · {w.title}</b><span className="db-dim">{w.holds} holds · {w.criticalHolds} critical</span></div>
                      {w.situation ? <div className="sc-week-sit">{w.situation}…</div> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
