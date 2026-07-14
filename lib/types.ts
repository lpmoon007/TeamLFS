// Shared types for the participant experience. Mirrors the Supabase schema (§4).

export type Section = 'TEAM' | 'EXTERNAL' | 'INTERNAL';
export type SessionStatus = 'draft' | 'live' | 'paused' | 'ended';
export type MessageSender = 'npc' | 'me' | 'system' | string;

export interface Scenario {
  id: string;
  title: string;
  summary: string | null;
}

export interface SessionRow {
  id: string;
  scenario_id: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
}

export interface Seat {
  id: string;
  key: string;
  name: string;
  role: string | null;
  meta: Record<string, unknown>;
}

export interface Participant {
  id: string;
  session_id: string;
  seat_id: string;
  token: string;
  channel_key: string;
  name: string | null;
  email: string | null;
  present: boolean;
  joined_at: string | null;
}

export interface Contact {
  id: string;
  key: string;
  full: string;
  role: string | null;
  section: Section | null;
  color: string | null;
  callable: boolean;
  persona: string | null;
  voice_id: string | null;
  opener: string | null;
  meta: Record<string, unknown>;
}

export interface DocumentRow {
  id: string;
  key: string;
  title: string;
  meta: Record<string, unknown>;
  body_json: Record<string, unknown>;
}

export interface ThreadRow {
  id: string;
  seat_id: string;
  contact_key: string;
  is_group: boolean;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  sender: MessageSender;
  body: string;
  sent_at: string;
}

export interface EmailRow {
  id: string;
  contact_key: string;
  subject: string;
  body_json: Record<string, unknown>;
  document_id: string | null;
  status: 'pending' | 'delivered' | 'read' | 'archived';
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  decision: 'approved' | 'returned' | null;
  decision_json: Record<string, unknown>;
  decided_at: string | null;
}

/** A teammate = another participant (real person) in the same session. */
export interface Teammate {
  participant_id: string;
  seat_key: string;
  name: string;
  role: string | null;
  present: boolean;
}

/** A rendered thread = its contact + messages. */
export interface ThreadView {
  thread: ThreadRow;
  contact: Contact | null;
  messages: MessageRow[];
}

/** Everything the participant app needs for one seat, resolved server-side. */
export interface SeatBundle {
  session: SessionRow;
  participant: Participant;
  seat: Seat;
  scenario: Scenario;
  contacts: Contact[];
  teammates: Teammate[];
  openingBrief: DocumentRow | null;
  seatBrief: DocumentRow | null;
  threads: ThreadView[];
  emails: EmailRow[];
  /** Documents attached to this seat's emails, keyed by document id. */
  documentsById: Record<string, DocumentRow>;
}

export type ResolveResult =
  | { ok: true; bundle: SeatBundle }
  | { ok: false; reason: 'session_not_found' | 'invalid_token' | 'session_draft' | 'session_ended'; session?: SessionRow };
