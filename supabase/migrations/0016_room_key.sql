-- =============================================================================
-- TLFS — per-session realtime room secret. The SHARED channels (room deliberation:
-- proposal/stance/decision_lock/surface/ruled, and presence) are session-wide by design —
-- every seat joins them — so they can't use the per-seat channel_key. They were keyed only
-- by the session UUID, which appears in participant links, so an OUTSIDER who obtains a
-- session id could subscribe and observe the room. This adds an unguessable per-session
-- `room_key`: the shared channels are keyed on it, and it's delivered only inside the
-- session's own participant bundles (each gated by that seat's magic-link token).
--
-- Additive; existing rows get a random key via the default. The DB (RLS) stays the
-- authoritative store; this hardens the low-latency delivery layer on top of it.
-- =============================================================================

alter table sessions add column if not exists room_key uuid not null default gen_random_uuid();

comment on column sessions.room_key is
  'Unguessable per-session secret keying the SHARED realtime channels (room + presence). '
  'Delivered only in the session participants'' own bundles; never derivable from the session id alone.';
