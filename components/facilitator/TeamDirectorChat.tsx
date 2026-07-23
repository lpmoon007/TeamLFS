'use client';
import { useRef, useState } from 'react';
import { askTeamDirector, type ChatTurn } from '@/lib/director-chat';
import { DictateButton } from '@/components/DictateButton';

// The Team Director chat on the facilitator team debrief — an AI head-coach Q&A grounded
// in the communication map + the Tier-B board. Facilitator-gated (no token). Reuses the
// solo chat's CSS (.chat / .chat-log / .chat-msg / .chat-quick / .chat-input) which the
// facilitator debrief loads globally.

const SEED =
  'I watched the whole room. Ask me why any team vital read the way it did — airtime, resilience, coverage, safety — or who carried it and who went quiet. Try: “Why did resilience read low?”';

export function TeamDirectorChat({ sessionId, chips }: { sessionId: string; chips: string[] }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [box, setBox] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const quick = [...chips, 'Who carried the room, and who went quiet?', 'What was the team’s single biggest miss?'].slice(0, 4);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setBox('');
    const history = turns;
    setTurns((t) => [...t, { role: 'user', content: q }]);
    setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), 0);
    try {
      const res = await askTeamDirector({ sessionId, history, question: q });
      setTurns((t) => [...t, { role: 'assistant', content: res.ok && res.reply ? res.reply : 'I couldn’t reach the film just now — ask me again in a moment.' }]);
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
      <div className="chat-quick">
        {quick.map((c) => (
          <button className="chat-chip" key={c} disabled={busy} onClick={() => ask(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={box}
          onChange={(e) => setBox(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(box); } }}
          placeholder="Ask the Director about the team…"
          autoComplete="off"
        />
        <DictateButton onText={(t) => setBox((v) => (v ? v + ' ' + t : t))} />
        <button disabled={busy || !box.trim()} onClick={() => ask(box)}>Ask</button>
      </div>
    </div>
  );
}
