'use client';
import type { Contact, DocumentRow, EmailRow, Teammate } from '@/lib/types';
import { colorFrom, initials, truncate } from '@/lib/ui';

interface FeedItem { id: string; text: string }

export function LeftPanel({
  openingBrief,
  feed,
  contacts,
  teammates,
  online,
  emails,
  selectedKey,
  selectedEmailId,
  unreadByContact,
  lastByContact,
  onSelectThread,
  onSelectEmail,
  onOpenFullBrief,
}: {
  openingBrief: DocumentRow | null;
  feed: FeedItem[];
  contacts: Contact[];
  teammates: Teammate[];
  online: Set<string>;
  emails: EmailRow[];
  selectedKey: string | null;
  selectedEmailId: string | null;
  unreadByContact: Record<string, number>;
  lastByContact: Record<string, string>;
  onSelectThread: (contactKey: string) => void;
  onSelectEmail: (id: string) => void;
  onOpenFullBrief: () => void;
}) {
  const summary = (openingBrief?.body_json?.text as string | undefined) ?? '';
  const external = contacts.filter((c) => c.section === 'EXTERNAL');
  const internal = contacts.filter((c) => c.section === 'INTERNAL' || !c.section);

  return (
    <aside className="left">
      <div className="scroll">
        {/* Situation */}
        <section className="panel">
          <div className="panel-head">
            <h3>Situation</h3>
            {openingBrief ? (
              <button className="btn ghost" style={{ padding: '3px 8px' }} onClick={onOpenFullBrief}>
                Read full brief
              </button>
            ) : null}
          </div>
          <div className="panel-body">
            <div className="situation-text">
              {summary ? truncate(summary, 320) : 'Awaiting situation brief…'}
            </div>
          </div>
        </section>

        {/* Live feed */}
        <section className="panel">
          <div className="panel-head">
            <h3>Feed</h3>
          </div>
          <div className="panel-body">
            <div className="feed">
              {feed.length === 0 ? (
                <div className="feed-empty">No updates yet.</div>
              ) : (
                feed.map((f) => (
                  <div className="feed-item" key={f.id}>
                    {f.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section className="panel">
          <div className="panel-head">
            <h3>Contacts</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {teammates.length > 0 && <div className="section-label">Team</div>}
            {teammates.map((t) => (
              <ContactRow
                key={`team-${t.seat_key}`}
                name={t.name}
                sub={lastByContact[t.seat_key] ? truncate(lastByContact[t.seat_key]!, 38) : t.role ?? ''}
                color={colorFrom(t.seat_key)}
                online={online.has(t.seat_key) || t.present}
                active={selectedKey === t.seat_key}
                callable={false}
                unread={unreadByContact[t.seat_key] ?? 0}
                onClick={() => onSelectThread(t.seat_key)}
              />
            ))}

            {external.length > 0 && <div className="section-label">External</div>}
            {external.map((c) => (
              <ContactRow
                key={c.id}
                name={c.full}
                sub={lastByContact[c.key] ? truncate(lastByContact[c.key]!, 38) : c.role ?? ''}
                color={c.color ?? colorFrom(c.key)}
                online={online.has(c.key)}
                active={selectedKey === c.key}
                callable={c.callable}
                unread={unreadByContact[c.key] ?? 0}
                onClick={() => onSelectThread(c.key)}
              />
            ))}

            {internal.length > 0 && <div className="section-label">Internal</div>}
            {internal.map((c) => (
              <ContactRow
                key={c.id}
                name={c.full}
                sub={lastByContact[c.key] ? truncate(lastByContact[c.key]!, 38) : c.role ?? ''}
                color={c.color ?? colorFrom(c.key)}
                online={online.has(c.key)}
                active={selectedKey === c.key}
                callable={c.callable}
                unread={unreadByContact[c.key] ?? 0}
                onClick={() => onSelectThread(c.key)}
              />
            ))}
          </div>
        </section>

        {/* Email */}
        <section className="panel">
          <div className="panel-head">
            <h3>Email</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {emails.length === 0 ? (
              <div className="feed-empty">Inbox empty.</div>
            ) : (
              emails.map((e) => (
                <button
                  key={e.id}
                  className={`email-row${e.read_at ? '' : ' unread'}${selectedEmailId === e.id ? ' active' : ''}`}
                  onClick={() => onSelectEmail(e.id)}
                >
                  <span className="e-subj">{e.subject}</span>
                  <span className="e-from">{e.contact_key}</span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function ContactRow({
  name,
  sub,
  color,
  online,
  active,
  callable,
  unread,
  onClick,
}: {
  name: string;
  sub: string;
  color: string;
  online: boolean;
  active: boolean;
  callable: boolean;
  unread: number;
  onClick?: () => void;
}) {
  return (
    <button className={`contact${active ? ' active' : ''}`} onClick={onClick} disabled={!onClick}>
      <span className={`dot${online ? ' online' : ''}`} />
      <span className="c-av" style={{ background: color }}>
        {initials(name)}
      </span>
      <span className="c-main">
        <span className="c-name">{name}</span>
        {sub ? <span className="c-sub">{sub}</span> : null}
      </span>
      <span className="c-meta">
        {unread > 0 ? <span className="badge">{unread}</span> : null}
        {callable ? <span className="tag-call">CALL</span> : null}
      </span>
    </button>
  );
}
