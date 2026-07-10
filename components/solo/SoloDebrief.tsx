import type { SoloDebrief } from '@/lib/solo-debrief';

// Solo Phase 5 — the game-film debrief view (crisis-engine.js renderDebrief, re-housed).
// A read-only server component: the whole payoff of a finished run. Authored prose
// (coaching / counterfactuals / ending / villain-hero) carries inline <b>/<i> emphasis
// from our own content, rendered with dangerouslySetInnerHTML (trusted, server-authored).

function Prose({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

const barColor = (s: number) => (s < 40 ? 'var(--danger)' : s < 60 ? 'var(--warn)' : 'var(--online)');

export function SoloDebriefView({ d }: { d: SoloDebrief }) {
  return (
    <div className="sd">
      <div className={`sd-top ${d.survived ? 'survive' : 'fail'}`}>
        <div className="sd-verdict">{d.verdictTag}</div>
        <h2>{d.verdictHeadline}</h2>
        <p className="sd-drivers">{d.finalDrivers.map((dr) => `${dr.label} ${dr.display}`).join(' · ')}</p>
        <div className="sd-score">
          <span className="big">{d.overall}</span>
          <span className="max">/ 100 leadership</span>
          <span className="gr">{d.grade}</span>
        </div>
      </div>

      <div className="sd-body">
        {d.ending ? (
          <>
            <div className="sd-h">How it ended</div>
            <div className={`sd-ending ${d.ending.tone}`}>
              {d.ending.tag ? <div className="sd-ending-tag">{d.ending.tag}</div> : null}
              <h3>{d.ending.title}</h3>
              <p>{d.ending.txt}</p>
            </div>
          </>
        ) : null}

        <div className="sd-h">The read — how you led</div>
        {d.dims.map((dim) => (
          <div className="sd-dim" key={dim.key}>
            <div className="sd-dim-top">
              <b>{dim.label}</b>
              <span className="s">{dim.score}</span>
            </div>
            <div className="sd-bar">
              <span style={{ width: `${dim.score}%`, background: barColor(dim.score) }} />
            </div>
            <div className="sd-dim-note">{dim.note}</div>
          </div>
        ))}

        <div className="sd-h">The team you walked in with — {d.dispositionLabel}</div>
        <div className="sd-read">{d.dispositionRead}</div>

        <div className="sd-h">The counterfactual — what you weren’t told</div>
        {d.counterfactuals.length ? (
          <>
            {d.counterfactuals.map((cf, i) => (
              <div className="sd-cf" key={i}>
                <div className="sd-cf-h">
                  {cf.who} was holding this — and you never asked
                  {cf.critical ? <span className="sd-crit">critical</span> : null}
                </div>
                <Prose className="sd-cf-txt" html={cf.text} />
              </div>
            ))}
            {d.surfacedCount ? (
              <div className="sd-cf good">
                <div className="sd-cf-h">Where you did dig</div>
                <div className="sd-cf-txt">
                  You did surface {d.surfacedCount} held item{d.surfacedCount > 1 ? 's' : ''} — proof you know how. The
                  misses weren’t inability. They were attention.
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="sd-cf good">
            <div className="sd-cf-h">You surfaced what your team was holding</div>
            <div className="sd-cf-txt">
              In every week, you reached the person sitting on the decisive information and pulled it into the open
              before you decided. That is the difference between a leader who is briefed and one who thinks they are.
            </div>
          </div>
        )}

        <div className="sd-h">The game-film — your crisis, moment by moment</div>
        <div className="sd-tl">
          {d.gameFilm.map((m, i) => (
            <div className={`sd-tl-item ${m.cls}`} key={i}>
              <div className="sd-tl-when">
                Wk {m.week}
                {m.day ? ` · Day ${m.day}` : ''}
              </div>
              <div className="sd-tl-body">
                <div className="sd-tl-txt">{m.text}</div>
                {m.tag ? (
                  <div className={`sd-tl-badge ${m.cls}`}>
                    {m.tag}
                    {m.note ? <span className="sd-tl-note"> · {m.note}</span> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="sd-h">Where to grow — what would have changed the outcome</div>
        <div className="sd-coach-intro">
          Your two lowest reads, and the concrete moves that would have moved them. This is the part worth taking into
          the next crisis.
        </div>
        {d.coaching.map((c) => (
          <div className="sd-coach" key={c.key}>
            <div className="sd-coach-h">
              <span className="sd-coach-dim">{c.label}</span>
              <span className="sd-coach-sc">scored {c.score}/100</span>
            </div>
            <div className="sd-coach-lead">
              To reach a different outcome on <b>{c.label.toLowerCase()}</b>, you could have:
            </div>
            <ol className="sd-coach-list">
              {c.lines.map((line, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </ol>
          </div>
        ))}

        <div className="sd-h">Villain or hero?</div>
        <div className="sd-vh">
          <div className="sd-vh-head">
            <div className="sd-vh-eyebrow">The frame that outlasts the score</div>
            <h3>Nobody chooses to be the villain.</h3>
            <div className="sd-vh-formula">
              Event + Response = Outcome — you don’t pick the crisis, only who you were inside it.
            </div>
          </div>
          <div className="sd-vh-frames">
            <div className="sd-vh-frame">
              <div className="sd-vh-tag hero">Hero</div>
              <div className="sd-vh-who">{d.villainHero.heroWho}</div>
              <div className="sd-vh-txt">{d.villainHero.heroTxt}</div>
            </div>
            <div className="sd-vh-frame">
              <div className="sd-vh-tag villain">Villain</div>
              <div className="sd-vh-who">{d.villainHero.villainWho}</div>
              <div className="sd-vh-txt">{d.villainHero.villainTxt}</div>
            </div>
          </div>
          <div className="sd-vh-close">
            Every crisis makes you one or the other in someone’s story. The leader who survives with their people’s
            trust intact did something harder than survive: <b>they stayed the same person under pressure that they
            were before it.</b>
          </div>
        </div>
      </div>
    </div>
  );
}
