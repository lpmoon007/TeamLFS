-- =============================================================================
-- The Signal — Build Addendum A1: communication-map capture (LOCK — non-retrofittable)
--
-- A1.2 Per-seat inject resolution state. For every fired inject, record which seat
-- it reached and whether that seat addressed it. This powers the team debrief's
-- "critical conversation that never happened" edges and the unaddressed-risk gaps.
--
-- (A1.1 directed sender→recipient is already captured: message_sent events carry
--  seat_id = sender and target = recipient; we additionally enrich the payload with
--  an explicit `recipients` array in the app for group-addressing forward-compat.
--  A1.4 "raised-then-overridden" is a DERIVED signal — reserved as a versioned trait
--  below, computed later, never flagged at capture time.)
-- =============================================================================

create type inject_resolution_state as enum ('delivered', 'opened', 'addressed', 'ignored');

create table inject_resolution (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions (id) on delete cascade,
  inject_id    uuid not null references injects (id) on delete cascade,
  seat_id      uuid not null references seats (id) on delete cascade,
  contact_key  text,   -- the thread the inject addressed (for reconciliation)
  state        inject_resolution_state not null default 'delivered',
  delivered_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (session_id, inject_id, seat_id)
);
create index inject_resolution_session_idx on inject_resolution (session_id);
create index inject_resolution_seat_idx on inject_resolution (session_id, seat_id);

comment on table inject_resolution is
  'Build Addendum A1.2 — per-seat resolution of each fired inject: delivered → '
  'opened → addressed, or ignored. Set delivered on fire; reconciled to its final '
  'state at session finalize (from the event log). Cross-seat, session-scoped.';

alter table inject_resolution enable row level security;  -- server/facilitator only

-- --- A1.4: reserve the "raised-then-overridden" DERIVED signal as a versioned trait.
-- It requires cross-thread analysis (a message raising a concern + the thread's
-- subsequent dismissal), so it is scored later — its evidence extractor is a stub
-- for now and it stays status='hypothesis'. Never flagged at capture time.
insert into trait_registry (trait_key, taxonomy_version, definition, observable_signals, scoring_rubric_ref, status) values
  ('raised_then_overridden', 'v0.1',
   'A participant raised a material concern and the group dismissed or talked past it.',
   '["raises a concern in a thread","thread continues without engaging it","decision proceeds unchanged"]'::jsonb,
   'lib/scoring/registry.ts#raised_then_overridden', 'hypothesis')
on conflict (trait_key, taxonomy_version) do nothing;
