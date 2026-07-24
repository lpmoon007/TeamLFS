'use client';
import { useState } from 'react';
import { askDirector } from '@/lib/director-chat';
import type { SoloFilmMoment } from '@/lib/solo-debrief';

// The game-film timeline, now interactive. Every moment can be opened to ask the Director a
// question about that exact beat — grounded in the run record, answered inline underneath
// the moment. Red beats (a miss, a hedge) lead with "What could I have done differently
// here?" because that's the beat worth mining; every beat also offers "Why did this matter?".
// Uses the same .tl / .tl-item markup the debrief already styles.

const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function MomentAsk({ m, sessionId, token }: { m: SoloFilmMoment; sessionId: string; token?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  const bad = m.cls === 'bad' || m.type === 'miss' || m.type === 'hedge';
  const stock = bad
    ? ['What could I have done differently here?', 'Why did this cost me?']
    : ['What did this move do for me?', 'How could I have made this even stronger?'];

  const ask = async (q: string) => {
    if (busy) return;
    setBusy(true);
    setAsked(q);
    setReply(null);
    const when = `Week ${m.week}${m.day ? `, day ${m.day}` : ''}`;
    const grounded = `Look at this exact moment in my run — ${when}: "${strip(m.text)}". ${q} Be specific to this beat.`;
    try {
      const res = await askDirector({ sessionId, token, history: [], question: grounded });
      setReply(res.ok && res.reply ? res.reply : 'I couldn’t reach the film just now — try again in a moment.');
    } catch {
      setReply('I couldn’t reach the film just now — try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tl-ask">
      {!open ? (
        <button type="button" className="tl-ask-open" onClick={() => setOpen(true)}>
          {bad ? 'Ask about this →' : 'Ask the Director →'}
        </button>
      ) : (
        <div className="tl-ask-body">
          <div className="tl-ask-chips">
            {stock.map((q) => (
              <button type="button" key={q} className="tl-ask-chip" disabled={busy} onClick={() => ask(q)}>
                {q}
              </button>
            ))}
            <button type="button" className="tl-ask-close" onClick={() => { setOpen(false); setAsked(null); setReply(null); }}>
              ×
            </button>
          </div>
          {asked ? (
            <div className="tl-ask-turn">
              <div className="tl-ask-q">{asked}</div>
              <div className="tl-ask-a">
                {busy && !reply ? <span className="chat-dots"><i /><i /><i /></span> : <span style={{ whiteSpace: 'pre-wrap' }}>{reply}</span>}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function GameFilm({ moments, sessionId, token }: { moments: SoloFilmMoment[]; sessionId: string; token?: string }) {
  return (
    <div className="tl">
      {moments.map((m, i) => (
        <div className={`tl-item ${m.type} ${m.cls}`} key={i}>
          <div className="tl-when">Wk {m.week}{m.day ? ` · Day ${m.day}` : ''}</div>
          <div className="tl-txt">{m.text}</div>
          {m.tag ? (
            <div className={`tl-badge ${m.cls || 'key'}`}>
              {m.tag}{m.note ? <span className="tl-note"> · {m.note}</span> : null}
            </div>
          ) : null}
          <MomentAsk m={m} sessionId={sessionId} token={token} />
        </div>
      ))}
    </div>
  );
}
