// Realtime channel names — shared by the browser (subscribe) and the server
// (broadcast). Keep these in one place so both sides always agree.

/** Per-seat DIRECTED channel (messages/emails/calls/injects for one seat). Keyed on the
 *  participant's unguessable `channel_key` — NOT the seat slug — so a teammate who knows
 *  the session id can't subscribe to another seat's private stream. */
export function seatChannel(sessionId: string, channelKey: string): string {
  return `signal:session:${sessionId}:seat:${channelKey}`;
}

/** Session-wide presence channel: every seat joins → everyone sees who's online. Keyed on
 *  the per-session room_key so an outsider with only the session id can't subscribe. */
export function sessionPresenceChannel(sessionId: string, roomKey: string): string {
  return `signal:session:${sessionId}:presence:${roomKey}`;
}

/** Session-wide room channel: shared deliberation events (proposals / stances /
 *  decision-lock / surface / ruled) every seat must see. Keyed on the per-session
 *  room_key (delivered only in the session's own participant bundles). */
export function sessionRoomChannel(sessionId: string, roomKey: string): string {
  return `signal:session:${sessionId}:room:${roomKey}`;
}
