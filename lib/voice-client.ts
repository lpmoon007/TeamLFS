'use client';

// Client-side glue for the voice loop: ask the server for the NPC's next line
// (npc-reply) and play it back (tts). Both keep provider keys server-side.

export interface VoiceCtx {
  sessionId: string;
  participantId: string;
  token: string;
  contactKey: string;
  callId: string;
}

/** Get the NPC's in-character reply text for the participant's utterance. */
export async function fetchNpcReply(ctx: VoiceCtx, userText: string): Promise<string | null> {
  try {
    const res = await fetch('/api/voice/npc-reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...ctx, userText }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.text === 'string' ? data.text : null;
  } catch {
    return null;
  }
}

let currentAudio: HTMLAudioElement | null = null;

/** Speak `text` in the contact's voice. Resolves when playback ends (or on failure). */
export async function speak(ctx: Omit<VoiceCtx, 'callId'>, text: string): Promise<void> {
  stopSpeaking();
  try {
    const res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: ctx.sessionId,
        participantId: ctx.participantId,
        token: ctx.token,
        contactKey: ctx.contactKey,
        text,
      }),
    });
    if (!res.ok) return; // TTS unavailable (no key / no voice) — transcript still shows the line.
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  } catch {
    // best-effort; the transcript is the source of truth
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
