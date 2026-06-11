-- =============================================================================
-- The Signal — Phase 1: Schema
-- Source of truth: production handoff doc §4 (Supabase data model).
--
-- This migration creates the full participant-experience data model:
--   authored content  : organizations, scenarios, seats, contacts, documents, injects
--   live run state     : sessions, participants, threads, messages, emails, calls,
--                        call_turns, inject_fires
--   the capture log    : events (append-only — the debrief ROI)
--
-- Conventions:
--   * uuid primary keys (gen_random_uuid)
--   * timestamptz everywhere, default now()
--   * enums for closed value-sets called out in the spec
--   * FKs cascade from the owning aggregate (scenario / session)
--   * RLS is enabled on every table; policies live in 0002_rls.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums (the spec's "kind ∈ …" / "type ∈ …" / "∈ …" value-sets)
-- -----------------------------------------------------------------------------

-- injects.kind — every authored scenario beat is one of these five
create type inject_kind as enum ('message', 'group', 'situation', 'call', 'email');

-- sessions.status — lifecycle of one live run
create type session_status as enum ('draft', 'live', 'paused', 'ended');

-- calls.direction — inbound (NPC calls participant) vs outbound (participant calls NPC)
create type call_direction as enum ('in', 'out');

-- emails.status — delivery lifecycle
create type email_status as enum ('pending', 'delivered', 'read', 'archived');

-- call_turns.who — who spoke this turn
create type call_turn_who as enum ('them', 'me');

-- =============================================================================
-- AUTHORED CONTENT  (seeded from seats/*.js — one row-set per scenario)
-- =============================================================================

-- organizations — client orgs that own scenarios
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- scenarios — e.g. "The Signal"
create table scenarios (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  title       text not null,
  summary     text,
  created_at  timestamptz not null default now()
);
create index scenarios_org_id_idx on scenarios (org_id);

-- seats — the playable positions (david, alex, …). `key` is the prototype seat id.
create table seats (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios (id) on delete cascade,
  key          text not null,          -- prototype seat id, e.g. "david"
  name         text not null,          -- person's name for this seat
  role         text,                   -- job title / role description
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (scenario_id, key)
);

-- contacts — NPCs + other people a seat can interact with (per scenario, per seat).
-- Carries the NPC persona + ElevenLabs voice_id (moved out of voices.js).
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios (id) on delete cascade,
  seat_id      uuid references seats (id) on delete cascade,  -- null = scenario-wide
  key          text not null,          -- prototype contact key
  "full"       text not null,          -- full display name (quoted: FULL is reserved)
  role         text,
  section      text,                   -- TEAM | EXTERNAL | INTERNAL grouping
  color        text,                   -- avatar/badge color token
  callable     boolean not null default false,
  persona      text,                   -- system prompt fragment for npc-reply
  voice_id     text,                   -- ElevenLabs voice id
  opener       text,                   -- first NPC line when a call connects
  created_at   timestamptz not null default now(),
  unique (scenario_id, seat_id, key)
);
create index contacts_scenario_id_idx on contacts (scenario_id);
create index contacts_seat_id_idx on contacts (seat_id);

-- documents — attachments / briefs / artifacts referenced by emails & briefs
create table documents (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios (id) on delete cascade,
  key          text not null,
  title        text not null,
  meta         jsonb not null default '{}'::jsonb,
  body_json    jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (scenario_id, key)
);
create index documents_scenario_id_idx on documents (scenario_id);

-- injects — authored beats. payload_json holds the content for the kind.
create table injects (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios (id) on delete cascade,
  seat_id      uuid references seats (id) on delete cascade,   -- null = all seats
  kind         inject_kind not null,
  payload_json jsonb not null default '{}'::jsonb,
  order_idx    integer not null default 0,
  created_at   timestamptz not null default now()
);
create index injects_scenario_id_order_idx on injects (scenario_id, order_idx);
create index injects_seat_id_idx on injects (seat_id);

-- =============================================================================
-- LIVE RUN STATE  (one set of rows per live session)
-- =============================================================================

-- sessions — one live run of a scenario
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios (id) on delete restrict,
  status       session_status not null default 'draft',
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);
create index sessions_scenario_id_idx on sessions (scenario_id);
create index sessions_status_idx on sessions (status);

-- participants — a real person bound to a seat via an opaque magic-link token.
-- token is a random, single-purpose string (NOT the seat key) — can't be guessed
-- or swapped. user_id optionally links a Supabase Auth user.
create table participants (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions (id) on delete cascade,
  seat_id      uuid not null references seats (id) on delete restrict,
  user_id      uuid references auth.users (id) on delete set null,
  token        text not null unique,
  name         text,
  email        text,
  joined_at    timestamptz,
  present      boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (session_id, seat_id)   -- one participant per seat per session (locks the seat)
);
create index participants_session_id_idx on participants (session_id);
create index participants_user_id_idx on participants (user_id);

-- threads — per participant/seat conversation with a contact
create table threads (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions (id) on delete cascade,
  seat_id      uuid not null references seats (id) on delete cascade,
  contact_key  text not null,         -- contact.key or a group thread key
  is_group     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (session_id, seat_id, contact_key)
);
create index threads_session_seat_idx on threads (session_id, seat_id);

-- messages — sender is 'npc' | 'me' | 'system' | a contact_key (group fan-out)
create table messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references threads (id) on delete cascade,
  sender       text not null,         -- 'npc' | 'me' | 'system' | <contact_key>
  body         text not null,
  sent_at      timestamptz not null default now()
);
create index messages_thread_id_sent_at_idx on messages (thread_id, sent_at);

-- emails — formal email channel; may carry a document attachment
create table emails (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions (id) on delete cascade,
  seat_id       uuid not null references seats (id) on delete cascade,
  contact_key   text not null,
  subject       text not null,
  body_json     jsonb not null default '{}'::jsonb,
  document_id   uuid references documents (id) on delete set null,
  status        email_status not null default 'pending',
  delivered_at  timestamptz,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index emails_session_seat_idx on emails (session_id, seat_id);

-- calls — in/out call instances
create table calls (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions (id) on delete cascade,
  seat_id       uuid not null references seats (id) on delete cascade,
  contact_key   text not null,
  direction     call_direction not null,
  started_at    timestamptz,
  ended_at      timestamptz,
  accepted      boolean,
  created_at    timestamptz not null default now()
);
create index calls_session_seat_idx on calls (session_id, seat_id);

-- call_turns — transcript turns within a call (the voice loop record)
create table call_turns (
  id        uuid primary key default gen_random_uuid(),
  call_id   uuid not null references calls (id) on delete cascade,
  who       call_turn_who not null,
  text      text not null,
  at        timestamptz not null default now()
);
create index call_turns_call_id_at_idx on call_turns (call_id, at);

-- inject_fires — what actually fired in a given session (vs the authored injects)
create table inject_fires (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions (id) on delete cascade,
  inject_id   uuid not null references injects (id) on delete cascade,
  fired_at    timestamptz not null default now(),
  fired_by    uuid references auth.users (id) on delete set null  -- facilitator/automation
);
create index inject_fires_session_id_idx on inject_fires (session_id);

-- =============================================================================
-- THE CAPTURE LOG  (append-only — this is the product's value)
-- =============================================================================
-- Log everything with a timestamp: what they decided, when, who they told,
-- what they ignored, response latency. This is the debrief.
--   types: thread_open, message_sent, email_read, doc_approved, doc_returned,
--          call_placed, call_accepted, call_declined, brief_opened, idle, …
create table events (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references sessions (id) on delete cascade,
  participant_id uuid references participants (id) on delete set null,
  type           text not null,
  target         text,
  payload_json   jsonb not null default '{}'::jsonb,
  at             timestamptz not null default now()
);
create index events_session_id_at_idx on events (session_id, at);
create index events_participant_id_idx on events (participant_id);
create index events_type_idx on events (type);

-- Append-only guard: block UPDATE/DELETE on the capture log at the DB level.
create or replace function prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'events is append-only; % is not permitted', tg_op;
end;
$$;

create trigger events_no_update
  before update on events
  for each row execute function prevent_mutation();

create trigger events_no_delete
  before delete on events
  for each row execute function prevent_mutation();
