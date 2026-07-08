import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Contact,
  DocumentRow,
  EmailRow,
  MessageRow,
  Participant,
  ResolveResult,
  Scenario,
  Seat,
  SessionRow,
  Teammate,
  ThreadRow,
  ThreadView,
} from '@/lib/types';

const SECTION_ORDER: Record<string, number> = { TEAM: 0, EXTERNAL: 1, INTERNAL: 2 };

/**
 * Resolve a magic-link token to a seat and load everything the participant app
 * needs. All reads use the service role (RLS is default-deny for the browser).
 * Guards: session existence/status, token validity (handoff §2A routing model).
 */
export async function resolveSeat(sessionId: string, token: string | undefined): Promise<ResolveResult> {
  const db = createAdminClient();

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, status, started_at, ended_at')
    .eq('id', sessionId)
    .maybeSingle<SessionRow>();

  if (!session) return { ok: false, reason: 'session_not_found' };

  if (!token) return { ok: false, reason: 'invalid_token', session };

  const { data: participant } = await db
    .from('participants')
    .select('id, session_id, seat_id, token, name, email, present, joined_at')
    .eq('session_id', sessionId)
    .eq('token', token)
    .maybeSingle<Participant>();

  if (!participant) return { ok: false, reason: 'invalid_token', session };

  if (session.status === 'draft') return { ok: false, reason: 'session_draft', session };
  if (session.status === 'ended') return { ok: false, reason: 'session_ended', session };

  const [{ data: seat }, { data: scenario }] = await Promise.all([
    db.from('seats').select('id, key, name, role, meta').eq('id', participant.seat_id).single<Seat>(),
    db
      .from('scenarios')
      .select('id, title, summary')
      .eq('id', session.scenario_id)
      .single<Scenario>(),
  ]);

  // Contacts for this seat (+ scenario-wide contacts with null seat_id).
  const { data: contactsRaw } = await db
    .from('contacts')
    .select('id, key, full, role, section, color, callable, persona, voice_id, opener, meta')
    .eq('scenario_id', session.scenario_id)
    .or(`seat_id.eq.${participant.seat_id},seat_id.is.null`);

  const contacts = (contactsRaw ?? []).slice().sort((a, b) => {
    const sa = SECTION_ORDER[a.section ?? ''] ?? 9;
    const sb = SECTION_ORDER[b.section ?? ''] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.full.localeCompare(b.full);
  }) as Contact[];

  // Teammates = other participants in this session, with their seat identity.
  const { data: others } = await db
    .from('participants')
    .select('id, present, name, seat:seats!inner(key, name, role)')
    .eq('session_id', sessionId)
    .neq('id', participant.id);

  const teammates: Teammate[] = (others ?? []).map((o: any) => ({
    participant_id: o.id,
    seat_key: o.seat?.key,
    name: o.seat?.name ?? o.name ?? o.seat?.key,
    role: o.seat?.role ?? null,
    present: o.present,
  }));

  // Documents: opening brief + this seat's brief.
  const briefKey = (seat?.meta?.brief_document_key as string | undefined) ?? `brief_${seat?.key}`;
  const { data: docs } = await db
    .from('documents')
    .select('id, key, title, meta, body_json')
    .eq('scenario_id', session.scenario_id)
    .in('key', ['opening_brief', briefKey]);

  const openingBrief = (docs ?? []).find((d) => d.key === 'opening_brief') ?? null;
  const seatBrief = (docs ?? []).find((d) => d.key === briefKey) ?? null;

  // Existing threads + messages for this participant/seat.
  const { data: threadRows } = await db
    .from('threads')
    .select('id, seat_id, contact_key, is_group')
    .eq('session_id', sessionId)
    .eq('seat_id', participant.seat_id);

  const threadIds = (threadRows ?? []).map((t) => t.id);
  let messages: MessageRow[] = [];
  if (threadIds.length) {
    const { data: msgs } = await db
      .from('messages')
      .select('id, thread_id, sender, body, sent_at')
      .in('thread_id', threadIds)
      .order('sent_at', { ascending: true });
    messages = (msgs ?? []) as MessageRow[];
  }

  const contactByKey = new Map(contacts.map((c) => [c.key, c]));
  const threads: ThreadView[] = (threadRows ?? []).map((t: ThreadRow) => ({
    thread: t,
    contact: contactByKey.get(t.contact_key) ?? null,
    messages: messages.filter((m) => m.thread_id === t.id),
  }));
  // Most recently active threads first.
  threads.sort((a, b) => lastAt(b) - lastAt(a));

  const { data: emails } = await db
    .from('emails')
    .select(
      'id, contact_key, subject, body_json, document_id, status, delivered_at, read_at, created_at, decision, decision_json, decided_at',
    )
    .eq('session_id', sessionId)
    .eq('seat_id', participant.seat_id)
    .order('created_at', { ascending: false });

  // Documents attached to those emails, so the email view can render/edit them.
  const docIds = (emails ?? []).map((e) => e.document_id).filter((x): x is string => !!x);
  const documentsById: Record<string, DocumentRow> = {};
  if (docIds.length) {
    const { data: emailDocs } = await db
      .from('documents')
      .select('id, key, title, meta, body_json')
      .in('id', docIds);
    for (const d of emailDocs ?? []) documentsById[d.id] = d as DocumentRow;
  }

  return {
    ok: true,
    bundle: {
      session,
      participant,
      seat: seat as Seat,
      scenario: scenario as Scenario,
      contacts,
      teammates,
      openingBrief: openingBrief as DocumentRow | null,
      seatBrief: seatBrief as DocumentRow | null,
      threads,
      emails: (emails ?? []) as EmailRow[],
      documentsById,
    },
  };
}

function lastAt(t: ThreadView): number {
  const last = t.messages[t.messages.length - 1];
  return last ? new Date(last.sent_at).getTime() : 0;
}

/** Read-only roster for the lobby fallback (unclaimed seats are claimable). */
export async function loadRoster(sessionId: string) {
  const db = createAdminClient();
  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, status')
    .eq('id', sessionId)
    .maybeSingle<Pick<SessionRow, 'id' | 'scenario_id' | 'status'>>();
  if (!session) return null;

  const { data: rows } = await db
    .from('participants')
    .select('present, name, seat:seats!inner(key, name, role)')
    .eq('session_id', sessionId);

  return {
    session,
    seats: (rows ?? []).map((r: any) => ({
      key: r.seat?.key,
      name: r.seat?.name,
      role: r.seat?.role,
      claimed: !!r.present,
    })),
  };
}
