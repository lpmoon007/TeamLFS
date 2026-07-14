// Realtime channel names — shared by the browser (subscribe) and the server
// (broadcast). Keep these in one place so both sides always agree.

/** Per-seat channel: directed events (messages/emails/calls/injects) for one seat. */
export function seatChannel(sessionId: string, seatKey: string): string {
  return `signal:session:${sessionId}:seat:${seatKey}`;
}

/** Session-wide presence channel: every seat joins → everyone sees who's online. */
export function sessionPresenceChannel(sessionId: string): string {
  return `signal:session:${sessionId}:presence`;
}

/** Session-wide room channel: shared deliberation events (proposals / stances /
 *  decision-lock) that every seat must see, not just one recipient. */
export function sessionRoomChannel(sessionId: string): string {
  return `signal:session:${sessionId}:room`;
}
