'use client';
import { useRef, useState } from 'react';
import { askDirector, type ChatTurn, type Followup } from '@/lib/director-chat';
import { DictateButton } from '@/components/DictateButton';

// The Director Chat panel in the solo game-film debrief — an AI head-coach Q&A grounded
// in the run record. Shown for every scenario; works for the participant (token) and the
// facilitator (cookie, token omitted).
const SEED =
  'I watched the whole run. Ask me where any score came from — or push back on one you think is wrong. Try: “I felt truthful the whole way — where did I lose points on truth?”';

export function DirectorChat({ sessionId, token, weakLabels }: { sessionId: string; token?: string; weakLabels: string[] }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [box, setBox] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef<Set<string>>(new Set());

  // Opening chips — seeded from the weakest reads. After each answer the coach hands back a
  // MIX of follow-ups: two that go deeper on the current thread, one lateral, one that resets
  // to a different high-level area — so the participant can mine one vein, then switch veins.
  const [chips, setChips] = useState<Followup[]>(() => {
    const seed: Followup[] = [];
    if (weakLabels[0]) seed.push({ kind: 'deeper', text: `Where did I lose points on ${weakLabels[0].toLowerCase()}?` });
    if (weakLabels[1]) seed.push({ kind: 'deeper', text: `What would a stronger move on ${weakLabels[1].toLowerCase()} have looked like?` });
    seed.push({ kind: 'reset', text: 'What was my single biggest miss?' });
    seed.push({ kind: 'reset', text: 'What did I do well?' });
    return seed;
  });

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setBox('');
    askedRef.current.add(q.toLowerCase());
    setChips((cur) => cur.filter((c) => c.text.toLowerCase() !== q.toLowerCase()));
    const history = turns;
    setTurns((t) => [...t, { role: 'user', content: q }]);
    setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), 0);
    try {
      const res = await askDirector({ sessionId, token, history, question: q });
      setTurns((t) => [...t, { role: 'assistant', content: res.ok && res.reply ? res.reply : 'I couldn’t reach the film just now — ask me again in a moment.' }]);
      const fresh = (res.followups ?? []).filter((c) => !askedRef.current.has(c.text.toLowerCase()));
      if (fresh.length) setChips(fresh.slice(0, 4));
    } catch {
      setTurns((t) => [...t, { role: 'assistant', content: 'I couldn’t reach the film just now — ask me again in a moment.' }]);
    } finally {
      setBusy(false);
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 0);
    }
  };

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        <div className="chat-msg dir">
          <div className="chat-who">Director</div>
          <div className="chat-bubble">{SEED}</div>
        </div>
        {turns.map((t, i) => (
          <div className={`chat-msg ${t.role === 'user' ? 'you' : 'dir'}`} key={i}>
            <div className="chat-who">{t.role === 'user' ? 'You' : 'Director'}</div>
            <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>{t.content}</div>
          </div>
        ))}
        {busy ? (
          <div className="chat-msg dir">
            <div className="chat-who">Director</div>
            <div className="chat-bubble"><span className="chat-dots"><i /><i /><i /></span></div>
          </div>
        ) : null}
      </div>
      {chips.length ? (
        <div className="chat-quick">
          {chips.map((c) => (
            <button className={`chat-chip${c.kind !== 'deeper' ? ' pivot' : ''}`} key={c.text} disabled={busy} onClick={() => ask(c.text)} title={c.kind === 'reset' ? 'Switch to a different area' : c.kind === 'wider' ? 'A different angle on this' : 'Go deeper'}>
              {c.kind === 'reset' ? '↺ ' : c.kind === 'wider' ? '↔ ' : ''}{c.text}
            </button>
          ))}
        </div>
      ) : null}
      <div className="chat-input">
        <input
          value={box}
          onChange={(e) => setBox(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(box); } }}
          placeholder="Ask the Director about your read…"
          autoComplete="off"
        />
        <DictateButton onText={(t) => setBox((v) => (v ? v + ' ' + t : t))} />
        <button disabled={busy || !box.trim()} onClick={() => ask(box)}>Ask</button>
      </div>
    </div>
  );
}
