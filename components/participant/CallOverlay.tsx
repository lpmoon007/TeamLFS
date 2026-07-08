'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Contact } from '@/lib/types';
import { colorFrom, initials } from '@/lib/ui';
import { placeCall, respondToCall, endCall as endCallAction, logEvent } from '@/lib/actions';
import { useSpeechRecognition } from '@/lib/speech';
import { fetchNpcReply, speak, stopSpeaking, type VoiceCtx } from '@/lib/voice-client';

// Phase 6 — the call overlay drives the real loop (handoff §7):
//   place/accept → play opener → [mic (Web Speech) OR typed] → npc-reply → tts → repeat.
// Outbound calls connect immediately; inbound calls (fired via inject) show Accept/
// Decline first. The typed fallback is always available.

interface Turn { who: 'them' | 'me'; text: string }
type Phase = 'ringing' | 'connecting' | 'connected' | 'thinking' | 'ended';

export function CallOverlay({
  contact,
  direction,
  incomingCallId,
  auth,
  onEnd,
}: {
  contact: Contact;
  direction: 'in' | 'out';
  incomingCallId?: string | null;
  auth: { sessionId: string; participantId: string; token: string };
  onEnd: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(direction === 'in' ? 'ringing' : 'connecting');
  const [callId, setCallId] = useState<string | null>(incomingCallId ?? null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [typed, setTyped] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const ctx: VoiceCtx | null = callId
    ? { ...auth, contactKey: contact.key, callId }
    : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [transcript.length, phase]);

  const playOpener = useCallback(
    async (opener: string | null) => {
      setPhase('connected');
      if (opener) {
        setTranscript((t) => [...t, { who: 'them', text: opener }]);
        await speak({ ...auth, contactKey: contact.key }, opener);
      }
    },
    [auth, contact.key],
  );

  // Outbound: place the call on mount.
  useEffect(() => {
    if (direction !== 'out' || startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      const res = await placeCall({ ...auth, contactKey: contact.key });
      if (!res.ok || !res.callId) {
        setPhase('ended');
        return;
      }
      setCallId(res.callId);
      await playOpener(res.opener ?? null);
    })();
  }, [direction, auth, contact.key, playOpener]);

  const accept = useCallback(async () => {
    if (!callId) return;
    setPhase('connecting');
    const res = await respondToCall({ ...auth, callId, accept: true });
    if (!res.ok) {
      setPhase('ended');
      return;
    }
    await playOpener(res.opener ?? null);
  }, [callId, auth, playOpener]);

  const decline = useCallback(async () => {
    if (callId) await respondToCall({ ...auth, callId, accept: false });
    onEnd();
  }, [callId, auth, onEnd]);

  // Send a participant utterance → NPC reply → speak it.
  const sendUtterance = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || !ctx || phase === 'thinking') return;
      setTranscript((t) => [...t, { who: 'me', text: body }]);
      setPhase('thinking');
      const reply = await fetchNpcReply(ctx, body);
      const line = reply ?? '…';
      setTranscript((t) => [...t, { who: 'them', text: line }]);
      setPhase('connected');
      await speak({ ...auth, contactKey: contact.key }, line);
    },
    [ctx, phase, auth, contact.key],
  );

  const stt = useSpeechRecognition({ onFinal: (text) => void sendUtterance(text) });

  const hangUp = useCallback(async () => {
    stopSpeaking();
    stt.stop();
    if (callId) await endCallAction({ ...auth, callId });
    onEnd();
  }, [callId, auth, onEnd, stt]);

  // Missed inbound call: log if declined implicitly by ending while ringing.
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const color = contact.color ?? colorFrom(contact.key);

  return (
    <div className="call-overlay">
      <div className="c-id">
        <div className="c-big-av" style={{ background: color }}>
          {initials(contact.full)}
        </div>
        <div className="c-name">{contact.full}</div>
        <div className="c-state">
          {phase === 'ringing'
            ? 'Incoming call…'
            : phase === 'connecting'
              ? 'Connecting…'
              : phase === 'thinking'
                ? `${contact.full.split(' ')[0]} is speaking…`
                : contact.role}
        </div>
      </div>

      <div className="view-scroll" style={{ width: '100%', maxWidth: 560, flex: '1 1 auto' }} ref={scrollRef}>
        {transcript.map((turn, i) => (
          <div key={i} className={`msg ${turn.who === 'me' ? 'me' : 'them'}`}>
            {turn.text}
          </div>
        ))}
        {stt.interim ? <div className="msg me" style={{ opacity: 0.5 }}>{stt.interim}</div> : null}
        {transcript.length === 0 && phase === 'connected' ? (
          <div className="msg system">Connected. Speak or type to talk to {contact.full.split(' ')[0]}.</div>
        ) : null}
      </div>

      {phase === 'connected' || phase === 'thinking' ? (
        <div className="composer" style={{ width: '100%', maxWidth: 560, background: 'transparent', border: 0 }}>
          {stt.supported ? (
            <button
              className={`btn${stt.listening ? ' primary' : ''}`}
              onClick={() => (stt.listening ? stt.stop() : stt.start())}
              title={stt.listening ? 'Stop listening' : 'Hold the mic and speak'}
            >
              {stt.listening ? '● Listening' : '🎤 Speak'}
            </button>
          ) : null}
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendUtterance(typed);
                setTyped('');
              }
            }}
            placeholder={stt.supported ? 'or type…' : 'Type what you say…'}
            disabled={phase === 'thinking'}
          />
          <button
            className="btn primary"
            disabled={phase === 'thinking' || !typed.trim()}
            onClick={() => {
              void sendUtterance(typed);
              setTyped('');
            }}
          >
            Send
          </button>
        </div>
      ) : null}

      <div className="c-actions">
        {phase === 'ringing' ? (
          <>
            <button className="call-btn accept" onClick={accept}>
              Accept
            </button>
            <button className="call-btn decline" onClick={decline}>
              Decline
            </button>
          </>
        ) : (
          <button className="call-btn end" onClick={hangUp}>
            End call
          </button>
        )}
      </div>
    </div>
  );
}
