'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Browser speech-to-text via the Web Speech API (Chrome/Edge). Feature-detected —
// where unavailable, `supported` is false and the UI falls back to typed input
// (handoff §7: keep the typed fallback). Cross-browser Whisper is a later option.

type SpeechRecognitionCtor = new () => any;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeechRecognition(opts: { onFinal: (text: string) => void }) {
  const { onFinal } = opts;
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const [supported] = useState<boolean>(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<any>(null);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let final = '';
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim(partial);
      if (final.trim()) {
        setInterim('');
        onFinalRef.current(final.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setInterim('');
    setListening(true);
    rec.start();
  }, []);

  useEffect(() => () => recRef.current?.abort?.(), []);

  return { supported, listening, interim, start, stop };
}
