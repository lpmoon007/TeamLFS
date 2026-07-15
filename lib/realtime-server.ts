import 'server-only';
import { SUPABASE_URL, serviceRoleKey } from '@/lib/env';
import { seatChannel, sessionRoomChannel } from '@/lib/channels';

/** Resolve the SHARED room topic for a session from its room_key (server-authoritative —
 *  never trust a client-supplied key). Returns null if the session is gone. */
export async function roomTopicFor(db: { from: (t: string) => any }, sessionId: string): Promise<string | null> {
  const { data } = await db.from('sessions').select('room_key').eq('id', sessionId).maybeSingle();
  return data?.room_key ? sessionRoomChannel(sessionId, data.room_key) : null;
}

/** Resolve the private directed topic for a seat from its occupant's channel_key. Returns
 *  null if the seat has no participant (nothing to deliver to). `db` is any admin client. */
export async function privateSeatTopic(
  db: { from: (t: string) => any },
  sessionId: string,
  seatId: string,
): Promise<string | null> {
  const { data } = await db.from('participants').select('channel_key').eq('session_id', sessionId).eq('seat_id', seatId).maybeSingle();
  return data?.channel_key ? seatChannel(sessionId, data.channel_key) : null;
}

// Server-side Realtime broadcast (handoff §6). The DB is the source of truth; a
// broadcast is a low-latency delivery signal to already-connected participants.
// Uses the Realtime broadcast HTTP endpoint so a server action doesn't have to
// manage a socket lifecycle. Best-effort: a failed broadcast never fails the write
// (the recipient still loads the row from the DB on next fetch).
//
// SECURITY NOTE (Phase 3): these are public channels keyed by session + seat. A
// determined anon who guesses a channel name could subscribe. The authoritative,
// RLS-protected store is Postgres; broadcast carries only delivery payloads. Harden
// later with Realtime authorization (private channels) — tracked for Phase 7.

export async function broadcast(
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const key = serviceRoleKey();
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ messages: [{ topic, event, payload }] }),
    });
  } catch {
    // swallow — delivery is best-effort; the row is already committed.
  }
}
