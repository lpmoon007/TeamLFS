'use client';
import type { Contact, MessageRow } from '@/lib/types';
import { formatTime } from '@/lib/ui';
import { useEffect, useRef } from 'react';

// Read path: renders an existing thread. The composer is present but disabled —
// sending lands in Phase 3 (messaging + presence). The Call button opens the call
// overlay; the live voice loop lands in Phase 6.
export function ThreadView({
  contact,
  contactKey,
  messages,
  onCall,
}: {
  contact: Contact | null;
  contactKey: string;
  messages: MessageRow[];
  onCall: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const title = contact?.full ?? contactKey;
  return (
    <div className="main">
      <div className="view-head">
        <div className="vh-main">
          <div className="vh-title">{title}</div>
          {contact?.role ? <div className="vh-sub">{contact.role}</div> : null}
        </div>
        {contact?.callable ? (
          <button className="btn" onClick={onCall}>
            Call
          </button>
        ) : null}
      </div>

      <div className="view-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="msg system">No messages in this thread yet.</div>
        ) : (
          messages.map((m) => {
            const kind = m.sender === 'me' ? 'me' : m.sender === 'system' ? 'system' : 'them';
            return (
              <div className={`msg ${kind}`} key={m.id}>
                {m.body}
                {kind !== 'system' ? <span className="at">{formatTime(m.sent_at)}</span> : null}
              </div>
            );
          })
        )}
      </div>

      <div className="composer">
        <textarea
          disabled
          placeholder="Replying goes live in the next phase of the build (read-only preview)."
        />
        <button className="btn" disabled>
          Send
        </button>
      </div>
    </div>
  );
}
