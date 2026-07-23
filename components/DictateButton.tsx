'use client';
import { useEffect, useRef, useState } from 'react';

// Push-to-talk dictation. Uses the browser's SpeechRecognition (Chrome/Edge/Safari) —
// client-side, no server, no cost. Calls onText with each final phrase; the parent appends
// it to the field. Renders nothing where unsupported (graceful degrade to typing).
export function DictateButton({ onText, className }: { onText: (t: string) => void; className?: string }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    const SR = (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t.trim()) onTextRef.current(t.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
  }, []);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { try { rec.stop(); } catch { /* noop */ } setListening(false); }
    else { try { rec.start(); setListening(true); } catch { /* already started */ } }
  };

  if (!supported) return null;
  return (
    <button
      type="button"
      className={`dictate${listening ? ' on' : ''}${className ? ` ${className}` : ''}`}
      onClick={toggle}
      title={listening ? 'Stop dictation' : 'Dictate (speak instead of type)'}
      aria-label={listening ? 'Stop dictation' : 'Dictate'}
    >
      {listening ? '● listening' : '🎤 speak'}
    </button>
  );
}
