'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { askLeaderCoach, commitFromCoach, type CoachTurn, type CoachCard } from '@/lib/coach-actions';
import { DictateButton } from '@/components/DictateButton';

// The Leadership Coach — a grounded conversation across all of a person's runs. Every reply is
// fact-gated server-side; behaviour-change proposals arrive as commitment / if-then cards the
// leader can commit to (→ a 30-day challenge). Evidence chips carry the claims.

const OPENERS = [
  'What is my single biggest gap?',
  'How much should I trust these findings?',
  'What would change your mind about my gap?',
  'What should I work on next?',
];

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  chips?: string[];
  cards?: CoachCard[];
  repaired?: boolean;
  refused?: boolean;
}

function parseChips(text: string): { body: string; chips: string[] } {
  const m = text.match(/\[\[EV:([^\]]*)\]\]/i);
  if (!m) return { body: text.trim(), chips: [] };
  const chips = m[1].split('|').map((s) => s.trim()).filter(Boolean);
  return { body: text.replace(m[0], '').trim(), chips };
}

export function LeaderCoach({ subjectId, readOnly = false }: { subjectId?: string; readOnly?: boolean } = {}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [box, setBox] = useState('');
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState<Record<string, boolean>>({});
  const logRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scroll = (smooth = false) => setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }), 0);

  // "Ask the coach about this finding" — a finding card dispatches a question; pick it up here
  // (skip in the read-only admin view). askRef keeps the listener bound to the latest ask().
  const askRef = useRef<(t: string) => void>(() => {});
  useEffect(() => {
    if (readOnly) return;
    const h = (e: Event) => {
      const q = (e as CustomEvent).detail as string;
      if (q) { logRef.current?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); askRef.current(q); }
    };
    window.addEventListener('lfs:coach-ask', h);
    return () => window.removeEventListener('lfs:coach-ask', h);
  }, [readOnly]);

  const ask = async (text: string) => {
    const qq = text.trim();
    if (!qq || busy) return;
    setBusy(true);
    setBox('');
    const history: CoachTurn[] = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: 'user', content: qq }]);
    scroll();
    try {
      const res = await askLeaderCoach({ history, question: qq, subjectId });
      if (res.ok && res.reply) {
        const { body, chips } = parseChips(res.reply);
        setTurns((t) => [...t, { role: 'assistant', content: res.reply!, chips, cards: res.cards, repaired: res.repaired, refused: res.refused }]);
      } else {
        const msg = res.reason === 'no_api_key' ? 'The coach isn’t configured yet (no API key).' : res.reason === 'no_runs' ? 'Finish a run first and I’ll have a record to work from.' : 'I couldn’t reach my model just then — try again in a moment.';
        setTurns((t) => [...t, { role: 'assistant', content: msg }]);
      }
    } catch {
      setTurns((t) => [...t, { role: 'assistant', content: 'I couldn’t reach my model just then — try again in a moment.' }]);
    } finally {
      setBusy(false);
      scroll(true);
    }
  };
  askRef.current = ask;

  const commit = async (card: CoachCard, k: string) => {
    if (committed[k]) return;
    const behavior = card.type === 'commitment' ? card.rep ?? '' : card.action ?? '';
    const res = await commitFromCoach({ behavior, cue: card.type === 'cue' ? card.cue : undefined, focusLabel: card.targets ?? card.marker });
    if (res.ok) { setCommitted((c) => ({ ...c, [k]: true })); router.refresh(); } // surface the new rep in the panel above
  };

  return (
    <section className="pf-sec">
      <div className="pf-sec-h">{readOnly ? 'The coach — grounded in their whole record' : 'Ask your coach — grounded in your whole record'}</div>
      <div className="co">
        <div className="co-log" ref={logRef}>
          <div className="co-msg dir"><div className="co-bubble">{readOnly
            ? 'Ask anything in their record — where a marker came from, whether a finding holds, what would overturn it. It only speaks to what their runs show; if it isn’t in the log, it says so.'
            : 'Ask me anything in your record — where a marker came from, whether a finding holds, what would overturn it, or what to work on next. I only speak to what your runs show; if it isn’t in your log, I’ll say so.'}</div></div>
          {turns.map((t, i) => {
            if (t.role === 'user') return <div className="co-msg you" key={i}><div className="co-bubble">{t.content}</div></div>;
            const { body, chips } = parseChips(t.content);
            return (
              <div className="co-msg dir" key={i}>
                <div className="co-bubble" style={{ whiteSpace: 'pre-wrap' }}>{body}</div>
                {chips.length ? <div className="co-chips">{chips.map((c, j) => <span className="co-chip" key={j}>{c}</span>)}</div> : null}
                {(t.cards ?? []).map((card, j) => {
                  const k = `${i}-${j}`;
                  return (
                    <div className={`co-card ${card.type}`} key={k}>
                      {card.type === 'commitment' ? (
                        <>
                          <div className="co-card-k">30-day rep{card.targets ? ` · ${card.targets}` : ''}</div>
                          <div className="co-card-main">{card.rep}</div>
                          {card.why ? <div className="co-card-why">{card.why}</div> : null}
                        </>
                      ) : (
                        <>
                          <div className="co-card-k">If-then cue{card.marker ? ` · ${card.marker}` : ''}</div>
                          <div className="co-card-main">When {card.cue} — then {card.action}</div>
                          {card.anchor ? <div className="co-card-why">From: {card.anchor}</div> : null}
                        </>
                      )}
                      {readOnly ? null : (
                        <button className="btn primary co-commit" disabled={committed[k]} onClick={() => commit(card, k)}>
                          {committed[k] ? 'Committed ✓' : 'Commit to this'}
                        </button>
                      )}
                    </div>
                  );
                })}
                {t.repaired ? <div className="co-flag">✓ checked against your log</div> : null}
                {t.refused ? <div className="co-flag warn">a claim couldn’t be evidenced — withheld</div> : null}
              </div>
            );
          })}
          {busy ? <div className="co-msg dir"><div className="co-bubble"><span className="chat-dots"><i /><i /><i /></span></div></div> : null}
        </div>
        {turns.length === 0 ? (
          <div className="co-openers">
            {OPENERS.map((o) => <button className="co-opener" key={o} disabled={busy} onClick={() => ask(o)}>{o}</button>)}
          </div>
        ) : null}
        <div className="co-input">
          <input value={box} onChange={(e) => setBox(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(box); } }} placeholder="Ask about your record…" autoComplete="off" />
          <DictateButton onText={(t) => setBox((v) => (v ? v + ' ' + t : t))} />
          <button className="btn primary" disabled={busy || !box.trim()} onClick={() => ask(box)}>Ask</button>
        </div>
      </div>
    </section>
  );
}
