'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Contact, EmailRow, MessageRow, SeatBundle, ThreadView as ThreadViewT } from '@/lib/types';
import { acceptDisclaimer, documentAction, logEvent, markEmailRead, sendMessage, type DocAction } from '@/lib/actions';
import { useParticipantChannel, useSessionPresence, type RealtimeEvent } from '@/lib/realtime';
import { colorFrom } from '@/lib/ui';
import { Header } from './Header';
import { LeftPanel } from './LeftPanel';
import { ThreadView } from './ThreadView';
import { EmailView } from './EmailView';
import { CallOverlay } from './CallOverlay';
import { BriefModal } from './BriefModal';
import { DisclaimerModal } from './DisclaimerModal';
import { Curtain } from './Curtain';

type Selection = { kind: 'thread'; contactKey: string } | { kind: 'email'; id: string } | null;
interface FeedItem { id: string; text: string }

// Orchestrates the participant experience: three-zone layout + overlays, with the
// initial state rendered from the server bundle and live updates applied from the
// Realtime channel (handoff §6). Phase 2 = read path; writes are onboarding-only.
export function ParticipantApp({ bundle }: { bundle: SeatBundle }) {
  const { session, participant, seat, scenario, contacts, teammates } = bundle;

  const [accepted, setAccepted] = useState<boolean>(participant.present);
  const [threads, setThreads] = useState<ThreadViewT[]>(bundle.threads);
  const [emails, setEmails] = useState<EmailRow[]>(bundle.emails);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [briefOpen, setBriefOpen] = useState(false);
  const [fullSituationOpen, setFullSituationOpen] = useState(false);
  const [callContact, setCallContact] = useState<Contact | null>(null);
  const [ended, setEnded] = useState(session.status === 'ended');

  // Teammates (other real participants) are conversable too — synthesize pseudo-
  // contacts so threads/selection resolve uniformly with NPC contacts.
  const teammateContacts = useMemo<Contact[]>(
    () =>
      teammates.map((t) => ({
        id: `team:${t.seat_key}`,
        key: t.seat_key,
        full: t.name,
        role: t.role,
        section: 'TEAM',
        color: colorFrom(t.seat_key),
        callable: false,
        persona: null,
        voice_id: null,
        opener: null,
        meta: {},
      })),
    [teammates],
  );
  const contactByKey = useMemo(
    () => new Map([...contacts, ...teammateContacts].map((c) => [c.key, c])),
    [contacts, teammateContacts],
  );

  const canSend = accepted && !ended && session.status === 'live';

  // Restore "accepted" from a prior visit (disclaimer shows once).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(`signal:accepted:${participant.id}`) === '1') {
      setAccepted(true);
    }
  }, [participant.id]);

  // ---- Realtime: apply live events onto local state ----
  const onEvent = useCallback(
    (evt: RealtimeEvent) => {
      switch (evt.event) {
        case 'message':
          applyIncomingMessage(setThreads, contactByKey, evt.payload);
          break;
        case 'email':
          setEmails((prev) => [evt.payload as EmailRow, ...prev]);
          break;
        case 'situation':
          setFeed((prev) => [{ id: crypto.randomUUID(), text: String(evt.payload?.text ?? evt.payload) }, ...prev]);
          break;
        case 'call':
          // Incoming call: open overlay if we know the contact.
          {
            const c = contactByKey.get(evt.payload?.contact_key);
            if (c) setCallContact(c);
          }
          break;
        case 'inject':
          // Generic beat — surface to the feed so nothing is silently dropped.
          setFeed((prev) => [{ id: crypto.randomUUID(), text: String(evt.payload?.summary ?? 'Update') }, ...prev]);
          break;
      }
    },
    [contactByKey],
  );

  const { connected } = useParticipantChannel({
    sessionId: session.id,
    seatKey: seat.key,
    enabled: accepted && !ended,
    onEvent,
  });

  const { online } = useSessionPresence({
    sessionId: session.id,
    seatKey: seat.key,
    name: seat.name,
    enabled: accepted && !ended,
  });

  // ---- derived: unread + last-message preview per contact ----
  const { unreadByContact, lastByContact } = useMemo(() => {
    const unread: Record<string, number> = {};
    const last: Record<string, string> = {};
    for (const t of threads) {
      const incoming = t.messages.filter((m) => m.sender !== 'me');
      const seenCount = seen[t.thread.id] ?? 0;
      unread[t.thread.contact_key] = Math.max(0, incoming.length - seenCount);
      const lastMsg = t.messages[t.messages.length - 1];
      if (lastMsg) last[t.thread.contact_key] = lastMsg.body;
    }
    return { unreadByContact: unread, lastByContact: last };
  }, [threads, seen]);

  // ---- onboarding write ----
  const handleAccept = useCallback(async () => {
    await acceptDisclaimer({ sessionId: session.id, participantId: participant.id, token: participant.token });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`signal:accepted:${participant.id}`, '1');
    }
    setAccepted(true);
  }, [session.id, participant.id, participant.token]);

  // ---- selection handlers (read-path capture log) ----
  const selectThread = useCallback(
    (contactKey: string) => {
      setSelection({ kind: 'thread', contactKey });
      const t = threads.find((x) => x.thread.contact_key === contactKey);
      if (t) {
        const incoming = t.messages.filter((m) => m.sender !== 'me').length;
        setSeen((prev) => ({ ...prev, [t.thread.id]: incoming }));
      }
      void logEvent({
        sessionId: session.id,
        participantId: participant.id,
        seatId: seat.id,
        type: 'thread_opened',
        channel: 'message',
        target: contactKey,
      });
    },
    [threads, session.id, participant.id, seat.id],
  );

  const selectEmail = useCallback(
    (id: string) => {
      setSelection({ kind: 'email', id });
      // Server marks read (status/read_at) + logs email_read (Layer 1).
      void markEmailRead({ sessionId: session.id, participantId: participant.id, token: participant.token, emailId: id }).then(
        (res) => {
          if (res.ok && res.read_at) {
            setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read_at: res.read_at!, status: 'read' } : e)));
          }
        },
      );
    },
    [session.id, participant.id, participant.token],
  );

  // ---- document actions (Phase 4): approve / return / edit an email's attachment ----
  const actOnDocument = useCallback(
    async (emailId: string, action: DocAction, payload?: { reason?: string; text?: string }) => {
      const res = await documentAction({
        sessionId: session.id,
        participantId: participant.id,
        token: participant.token,
        emailId,
        action,
        payload,
      });
      if (!res.ok && res.decision === undefined) return;
      setEmails((prev) =>
        prev.map((e) => {
          if (e.id !== emailId) return e;
          if (action === 'edit') return { ...e, decision_json: { ...e.decision_json, edited_text: payload?.text ?? '' } };
          return {
            ...e,
            decision: res.decision ?? e.decision,
            decided_at: new Date().toISOString(),
            decision_json: { ...e.decision_json, reason: payload?.reason ?? null },
          };
        }),
      );
    },
    [session.id, participant.id, participant.token],
  );

  const openBrief = useCallback(() => {
    setBriefOpen(true);
    void logEvent({
      sessionId: session.id,
      participantId: participant.id,
      seatId: seat.id,
      type: 'brief_opened',
      channel: 'brief',
    });
  }, [session.id, participant.id, seat.id]);

  const startCall = useCallback(() => {
    if (selection?.kind !== 'thread') return;
    const c = contactByKey.get(selection.contactKey);
    if (c?.callable) {
      setCallContact(c);
      void logEvent({
        sessionId: session.id,
        participantId: participant.id,
        seatId: seat.id,
        type: 'call_placed',
        channel: 'call',
        target: c.key,
      });
    }
  }, [selection, contactByKey, session.id, participant.id, seat.id]);

  // ---- send a message (Phase 3): optimistic append, then server persists/mirrors ----
  const sendInThread = useCallback(
    async (contactKey: string, body: string) => {
      const tempId = `local:${crypto.randomUUID()}`;
      const optimistic: MessageRow = {
        id: tempId,
        thread_id: `local:${contactKey}`,
        sender: 'me',
        body,
        sent_at: new Date().toISOString(),
      };
      // Mark the thread read (my own send shouldn't inflate unread) + append.
      setThreads((prev) => appendMessage(prev, contactByKey, contactKey, optimistic));

      const res = await sendMessage({
        sessionId: session.id,
        participantId: participant.id,
        token: participant.token,
        contactKey,
        body,
      });
      // Reconcile the optimistic row with the authoritative one.
      if (res.ok && res.message) {
        setThreads((prev) =>
          prev.map((t) =>
            t.thread.contact_key === contactKey
              ? {
                  ...t,
                  thread: { ...t.thread, id: res.message!.thread_id },
                  messages: t.messages.map((m) =>
                    m.id === tempId ? { ...m, id: res.message!.id, thread_id: res.message!.thread_id, sent_at: res.message!.sent_at } : m,
                  ),
                }
              : t,
          ),
        );
      }
    },
    [contactByKey, session.id, participant.id, participant.token],
  );

  // The un-sent message: capture verbatim as an omission event (spine §1).
  const draftDiscarded = useCallback(
    (contactKey: string, text: string) => {
      void logEvent({
        sessionId: session.id,
        participantId: participant.id,
        seatId: seat.id,
        type: 'message_draft_discarded',
        channel: 'message',
        target: contactKey,
        payload: { text, length: text.length },
      });
    },
    [session.id, participant.id, seat.id],
  );

  const selectedThread =
    selection?.kind === 'thread' ? threads.find((t) => t.thread.contact_key === selection.contactKey) : undefined;
  const selectedContact = selection?.kind === 'thread' ? contactByKey.get(selection.contactKey) ?? null : null;
  const selectedEmail = selection?.kind === 'email' ? emails.find((e) => e.id === selection.id) : undefined;

  if (!accepted) return <DisclaimerModal onAccept={handleAccept} />;

  return (
    <div className="app">
      <Header
        scenarioTitle={scenario.title}
        seatName={seat.name}
        seatRole={seat.role}
        connected={connected}
        onOpenBrief={openBrief}
      />
      <div className="body">
        <LeftPanel
          openingBrief={bundle.openingBrief}
          feed={feed}
          contacts={contacts}
          teammates={teammates}
          online={online}
          emails={emails}
          selectedKey={selection?.kind === 'thread' ? selection.contactKey : null}
          selectedEmailId={selection?.kind === 'email' ? selection.id : null}
          unreadByContact={unreadByContact}
          lastByContact={lastByContact}
          onSelectThread={selectThread}
          onSelectEmail={selectEmail}
          onOpenFullBrief={() => setFullSituationOpen(true)}
        />

        {selection?.kind === 'thread' && selectedContact !== undefined ? (
          <ThreadView
            contact={selectedContact}
            contactKey={selection.contactKey}
            messages={selectedThread?.messages ?? []}
            canSend={canSend}
            onSend={(body) => void sendInThread(selection.contactKey, body)}
            onDraftDiscarded={draftDiscarded}
            onCall={startCall}
          />
        ) : selection?.kind === 'email' && selectedEmail ? (
          <EmailView
            email={selectedEmail}
            document={selectedEmail.document_id ? bundle.documentsById[selectedEmail.document_id] ?? null : null}
            canAct={canSend}
            onApprove={() => void actOnDocument(selectedEmail.id, 'approve')}
            onReturn={(reason) => void actOnDocument(selectedEmail.id, 'return', { reason })}
            onEdit={(text) => void actOnDocument(selectedEmail.id, 'edit', { text })}
          />
        ) : (
          <div className="main">
            <div className="empty-main">
              <div>
                <div className="big">Welcome, {seat.name.split(' ')[0]}.</div>
                <div>Open your brief, then pick a contact or an email to begin.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {briefOpen ? <BriefModal title="Your Brief" doc={bundle.seatBrief} onClose={() => setBriefOpen(false)} /> : null}
      {fullSituationOpen ? (
        <BriefModal title="Situation Brief" doc={bundle.openingBrief} onClose={() => setFullSituationOpen(false)} />
      ) : null}
      {callContact ? <CallOverlay contact={callContact} onEnd={() => setCallContact(null)} /> : null}
      {ended ? <Curtain /> : null}
    </div>
  );
}

// Apply a broadcast 'message' to the right thread, creating the thread if needed.
function applyIncomingMessage(
  setThreads: React.Dispatch<React.SetStateAction<ThreadViewT[]>>,
  contactByKey: Map<string, Contact>,
  payload: any,
) {
  const contactKey: string = payload?.contact_key ?? payload?.thread_contact_key;
  const msg: MessageRow = {
    id: payload?.id ?? crypto.randomUUID(),
    thread_id: payload?.thread_id ?? `live:${contactKey}`,
    sender: payload?.sender ?? 'npc',
    body: String(payload?.body ?? ''),
    sent_at: payload?.sent_at ?? new Date().toISOString(),
  };
  setThreads((prev) => appendMessage(prev, contactByKey, contactKey, msg));
}

// Append a message to a contact's thread (creating it if needed), de-duped by id,
// bubbling the active thread to the top.
function appendMessage(
  prev: ThreadViewT[],
  contactByKey: Map<string, Contact>,
  contactKey: string,
  msg: MessageRow,
): ThreadViewT[] {
  const idx = prev.findIndex((t) => t.thread.contact_key === contactKey);
  if (idx === -1) {
    const newThread: ThreadViewT = {
      thread: { id: msg.thread_id, seat_id: '', contact_key: contactKey, is_group: false },
      contact: contactByKey.get(contactKey) ?? null,
      messages: [msg],
    };
    return [newThread, ...prev];
  }
  const next = prev.slice();
  const t = next[idx]!;
  if (t.messages.some((m) => m.id === msg.id)) return prev; // de-dupe
  next[idx] = { ...t, messages: [...t.messages, msg] };
  next.unshift(next.splice(idx, 1)[0]!); // bubble to top
  return next;
}
