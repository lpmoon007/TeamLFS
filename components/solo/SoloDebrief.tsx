import type { SoloDebrief } from '@/lib/solo-debrief';
import { DirectorChat } from '@/components/solo/DirectorChat';

// Solo game-film debrief — re-skinned to the prototype debrief layer (soloengine.css:
// .result / .res-top / .dim / .tl / .coach / .ending / .cf / .vh). Authored prose carries
// inline <b>/<i> from our own content, rendered with dangerouslySetInnerHTML (trusted).

function Prose({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SoloDebriefView({ d, token }: { d: SoloDebrief; token?: string }) {
  return (
    <div className="result">
      <div className={`res-top ${d.survived ? 'survive' : 'fail'}`}>
        <div className="res-verdict">{d.verdictTag}</div>
        <h2>{d.verdictHeadline}</h2>
        <p>{d.finalDrivers.map((dr) => `${dr.label} ${dr.display}`).join(' · ')}</p>
        <div className="res-score">
          <span className="big">{d.overall}</span>
          <span className="max">/ 100 leadership</span>
          <span className="gr">{d.grade}</span>
        </div>
      </div>

      <div className="res-body">
        {d.ending ? (
          <>
            <div className="res-h">How it ended</div>
            <div className={`ending ${d.ending.tone}`}>
              {d.ending.tag ? <div className="ending-tag">{d.ending.tag}</div> : null}
              <h3>{d.ending.title}</h3>
              <p>{d.ending.txt}</p>
            </div>
          </>
        ) : null}

        <div className="res-h">The read — how you led</div>
        {d.dims.map((dim) => (
          <div className="dim" key={dim.key}>
            <div className="dim-top">
              <b>{dim.label}</b>
              <span className="s">{dim.score} / 100</span>
            </div>
            <div className="dim-note">{dim.note}</div>
          </div>
        ))}

        {d.lens ? (
          <>
            <div className="res-h">The read behind the read — LDOL · {d.lens.version}</div>
            {d.lens.disciplines.map((disc) => (
              <div className="dim" key={disc.name}>
                <div className="dim-top">
                  <b>{disc.name}</b>
                  <span className="s">{disc.frame}</span>
                </div>
                <div className="dim-note">{disc.read}</div>
              </div>
            ))}
            <div className="read">
              <b>Building:</b> {d.lens.building.length ? d.lens.building.join('; ') : 'not enough confident evidence this run'}.
              <br />
              <b>Allowing:</b> {d.lens.allowing.length ? d.lens.allowing.join('; ') : 'nothing flagged this run'}.
            </div>
          </>
        ) : null}

        <div className="res-h">The team you walked in with — {d.dispositionLabel}</div>
        <div className="read">{d.dispositionRead}</div>

        <div className="res-h">The counterfactual — what you weren’t told</div>
        {d.counterfactuals.length ? (
          <>
            {d.counterfactuals.map((cf, i) => (
              <div className="cf" key={i}>
                <div className="cf-h">{cf.who} was holding this — and you never asked{cf.critical ? ' · critical' : ''}</div>
                <Prose className="cf-txt" html={cf.text} />
              </div>
            ))}
            {d.surfacedCount ? (
              <div className="cf good">
                <div className="cf-h">Where you did dig</div>
                <div className="cf-txt">You surfaced {d.surfacedCount} held item{d.surfacedCount > 1 ? 's' : ''} — proof you know how. The misses weren’t inability. They were attention.</div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="cf good">
            <div className="cf-h">You surfaced what your team was holding</div>
            <div className="cf-txt">In every week you reached the person sitting on the decisive information and pulled it into the open before you decided. That is the difference between a leader who is briefed and one who thinks they are.</div>
          </div>
        )}

        <div className="res-h">The game-film — your crisis, moment by moment</div>
        <div className="tl">
          {d.gameFilm.map((m, i) => (
            <div className={`tl-item ${m.type} ${m.cls}`} key={i}>
              <div className="tl-when">Wk {m.week}{m.day ? ` · Day ${m.day}` : ''}</div>
              <div className="tl-txt">{m.text}</div>
              {m.tag ? (
                <div className={`tl-badge ${m.cls || 'key'}`}>
                  {m.tag}{m.note ? <span className="tl-note"> · {m.note}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="res-h">Where to grow — what would have changed the outcome</div>
        <div className="coach-intro">Your two lowest reads, and the concrete moves that would have moved them. This is the part worth taking into the next crisis.</div>
        {d.coaching.map((c) => (
          <div className="coach" key={c.key}>
            <div className="coach-h">
              <span className="coach-dim">{c.label}</span>
              <span className="coach-sc">{c.score} / 100</span>
            </div>
            <div className="coach-lead">To reach a different outcome on <b>{c.label.toLowerCase()}</b>, you could have:</div>
            <ol className="coach-list">
              {c.lines.map((line, i) => <li key={i} dangerouslySetInnerHTML={{ __html: line }} />)}
            </ol>
          </div>
        ))}

        <div className="res-h">Villain or hero?</div>
        <div className="vh">
          <div className="vh-head">
            <div className="vh-eyebrow">The frame that outlasts the score</div>
            <h3>Nobody chooses to be the villain.</h3>
            <div className="vh-formula">Event + Response = Outcome</div>
          </div>
          <div className="vh-frames">
            <div className="vh-frame">
              <div className="vh-tag hero">Hero</div>
              <div className="vh-who">{d.villainHero.heroWho}</div>
              <div className="vh-txt">{d.villainHero.heroTxt}</div>
            </div>
            <div className="vh-frame">
              <div className="vh-tag villain">Villain</div>
              <div className="vh-who">{d.villainHero.villainWho}</div>
              <div className="vh-txt">{d.villainHero.villainTxt}</div>
            </div>
          </div>
          <div className="vh-close">Every crisis makes you one or the other in someone’s story. The leader who survives with their people’s trust intact did something harder than survive: <b>they stayed the same person under pressure that they were before it.</b></div>
        </div>

        <div className="res-h">Ask the Director</div>
        <div className="coach-intro">The Director watched every move you made. Ask it anything about your read — why a score landed where it did, where exactly you lost ground, what a stronger move would have looked like. It has the whole game film in front of it.</div>
        <DirectorChat sessionId={d.sessionId} token={token} weakLabels={d.coaching.map((c) => c.label)} />
      </div>
    </div>
  );
}
