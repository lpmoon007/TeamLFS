'use client';
import type { Contact } from '@/lib/types';
import { colorFrom, initials } from '@/lib/ui';

// Call overlay shell (handoff §9). Phase 2 shows the outbound-call UI and the NPC's
// opener line; the live voice loop (STT → in-character LLM → TTS) lands in Phase 6.
export function CallOverlay({ contact, onEnd }: { contact: Contact; onEnd: () => void }) {
  return (
    <div className="call-overlay">
      <div className="c-id">
        <div className="c-big-av" style={{ background: contact.color ?? colorFrom(contact.key) }}>
          {initials(contact.full)}
        </div>
        <div className="c-name">{contact.full}</div>
        <div className="c-state">{contact.role}</div>
      </div>

      <div className="view-scroll" style={{ width: '100%', maxWidth: 560, flex: '0 1 auto' }}>
        {contact.opener ? <div className="msg them">{contact.opener}</div> : null}
        <div className="msg system">
          Live voice (speech-to-text → in-character reply → text-to-speech) connects in a
          later phase. This is the call shell.
        </div>
      </div>

      <div className="c-actions">
        <button className="call-btn end" onClick={onEnd}>
          End call
        </button>
      </div>
    </div>
  );
}
