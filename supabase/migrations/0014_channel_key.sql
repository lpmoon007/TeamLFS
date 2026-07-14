-- =============================================================================
-- TLFS — per-seat realtime channel secret. Directed Realtime events (a seat's private
-- messages, injects, emails, calls) were broadcast on a topic keyed by the seat's SLUG
-- (signal:session:<uuid>:seat:ceo), which any participant who knows the session UUID can
-- guess and subscribe to — cross-seat eavesdropping within a session. This adds an
-- unguessable per-participant `channel_key`; the directed channel is now keyed on it, so
-- only the seat's own occupant (who received the key in their bundle) can subscribe.
-- Shared channels (room deliberation, presence) stay session-scoped by design.
--
-- Additive; existing rows get a random key via the default. The authoritative store stays
-- Postgres (RLS); this hardens the low-latency delivery layer on top of it.
-- =============================================================================

alter table participants add column if not exists channel_key uuid not null default gen_random_uuid();

comment on column participants.channel_key is
  'Unguessable per-seat secret keying the directed Realtime channel (prevents cross-seat '
  'eavesdropping). Delivered to the client in its own bundle only; never to teammates.';
