'use client';
import type { Contact, MessageRow } from '@/lib/types';
import { formatTime } from '@/lib/ui';
import { useEffect, useRef, useState } from 'react';

// Phase 3: live send. Enter sends, Shift+Enter newlines. The un-sent draft is
// captured as `message_draft_discarded` when the thread is abandoned with unsent
// text (the highest-signal omission, per the spine). The Call button opens the call
// overlay; the live voice loop lands in Phase 6.
export function ThreadView({
  contact,
  contactKey,
  messages,
  canSend,
  onSend,
  onDraftDiscarded,
  onCall,
}: {
  contact: Contact | null;
  contactKey: string;
  messages: MessageRow[];
  canSend: boolean;
  onSend: (body: string) => void;
  onDraftDiscarded: (contactKey: string, text: string) => void;
  onCall: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  draftRef.current = draft;
  const sentRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // Reset the composer when switching threads; capture the prior thread's un-sent
  // draft as an omission event on unmount / thread change.
  useEffect(() => {
    setDraft('');
    sentRef.current = false;
    return () => {
      const leftover = draftRef.current.trim();
      if (leftover && !sentRef.current) onDraftDiscarded(contactKey, leftover);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactKey]);

  const submit = () => {
    const body = draft.trim();
    if (!body || !canSend) return;
    sentRef.current = true;
    onSend(body);
    setDraft('');
    sentRef.current = false;
  };

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
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={canSend ? `Message ${title}…` : 'Messaging opens when the session is live.'}
          disabled={!canSend}
        />
        <button className="btn primary" onClick={submit} disabled={!canSend || !draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
