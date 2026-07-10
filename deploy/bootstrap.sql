-- =============================================================================
-- The Signal — one-shot bootstrap for a Supabase project.
-- Paste into the Supabase SQL Editor and Run. It:
--   1) RESETS the public schema (drops any prior build), then
--   2) applies migrations 0001-0008, then
--   3) seeds the "The Signal" scenario (+ a demo session for testing).
-- Generated — do not hand-edit; regenerate with scripts/build-bootstrap.sh.
-- =============================================================================

-- ---- 1. RESET public schema ----
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;


-- ==== 0001_initial_schema.sql ====

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

-- ==== 0002_rls.sql ====

-- =============================================================================
-- The Signal — Phase 1: Row Level Security
--
-- Access model for Phase 1 (per handoff §2A "token resolves server-side"):
--   * The participant magic-link token is resolved SERVER-SIDE (Edge Functions /
--     server actions using the service_role key, which BYPASSES RLS). That is the
--     primary read/write path for the live participant experience.
--   * RLS is therefore default-DENY for the anon/authenticated roles on all
--     tables; nothing is publicly readable or writable by a browser anon client.
--   * As a convenience for the optional Supabase Auth layer (§2A "auth just proves
--     identity"), an authenticated user MAY read the rows tied to their own
--     participant record (their session/seat/threads/messages/emails/calls).
--
-- The capture log (events) is never client-readable here — debrief tooling reads
-- it via the service role / facilitator dashboard (later phase).
-- =============================================================================

-- Enable RLS everywhere (default deny once enabled, no permissive policy = no access).
alter table organizations enable row level security;
alter table scenarios     enable row level security;
alter table seats         enable row level security;
alter table contacts      enable row level security;
alter table documents     enable row level security;
alter table injects       enable row level security;
alter table sessions      enable row level security;
alter table participants  enable row level security;
alter table threads       enable row level security;
alter table messages      enable row level security;
alter table emails        enable row level security;
alter table calls         enable row level security;
alter table call_turns    enable row level security;
alter table inject_fires  enable row level security;
alter table events        enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: is the current authenticated user the owner of this session's seat?
-- -----------------------------------------------------------------------------
create or replace function current_user_in_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from participants p
    where p.session_id = p_session_id
      and p.user_id = auth.uid()
  );
$$;

create or replace function current_user_owns_seat(p_session_id uuid, p_seat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from participants p
    where p.session_id = p_session_id
      and p.seat_id = p_seat_id
      and p.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Authenticated participant read policies (optional auth layer)
-- -----------------------------------------------------------------------------

-- A participant can read their own participant row(s).
create policy participants_self_select on participants
  for select to authenticated
  using (user_id = auth.uid());

-- ... and the session they belong to.
create policy sessions_member_select on sessions
  for select to authenticated
  using (current_user_in_session(id));

-- ... their own threads / messages / emails / calls (scoped to their seat).
create policy threads_owner_select on threads
  for select to authenticated
  using (current_user_owns_seat(session_id, seat_id));

create policy messages_owner_select on messages
  for select to authenticated
  using (
    exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and current_user_owns_seat(t.session_id, t.seat_id)
    )
  );

create policy emails_owner_select on emails
  for select to authenticated
  using (current_user_owns_seat(session_id, seat_id));

create policy calls_owner_select on calls
  for select to authenticated
  using (current_user_owns_seat(session_id, seat_id));

create policy call_turns_owner_select on call_turns
  for select to authenticated
  using (
    exists (
      select 1 from calls c
      where c.id = call_turns.call_id
        and current_user_owns_seat(c.session_id, c.seat_id)
    )
  );

-- Authored scenario content the participant's seat needs (read-only).
-- Scenario/seat/contacts/documents tied to a session the user is in.
create policy scenarios_member_select on scenarios
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = scenarios.id
        and current_user_in_session(s.id)
    )
  );

create policy seats_member_select on seats
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = seats.scenario_id
        and current_user_in_session(s.id)
    )
  );

create policy contacts_member_select on contacts
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = contacts.scenario_id
        and current_user_in_session(s.id)
    )
  );

create policy documents_member_select on documents
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = documents.scenario_id
        and current_user_in_session(s.id)
    )
  );

-- NOTE: no INSERT/UPDATE/DELETE policies for anon/authenticated are defined.
-- All writes (sending a message, marking email read, logging an event, firing an
-- inject, etc.) go through the service_role on the server, which bypasses RLS.
-- The capture log `events`, `injects`, `inject_fires`, `organizations`, and
-- `participants.*` writes are intentionally server-only for Phase 1.

-- ==== 0003_realtime.sql ====

-- =============================================================================
-- The Signal — Phase 1: Realtime publication
--
-- The participant UI subscribes to row changes for live delivery (§6):
--   * messages       — new chat / group messages
--   * emails         — email arrival + status changes (read/delivered)
--   * calls          — incoming/outbound call state
--   * call_turns     — live transcript turns during a call
--   * participants   — presence (present flag flips online/offline)
--   * inject_fires   — facilitator fired a beat
--
-- Presence/typing also use Supabase Realtime presence + broadcast channels
-- (no table needed for those ephemeral signals).
--
-- supabase_realtime is the default publication created by Supabase. We add the
-- tables the participant app needs to subscribe to. Guard each add so the
-- migration is idempotent across environments.
-- =============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'messages', 'emails', 'calls', 'call_turns', 'participants', 'inject_fires'
  ];
begin
  -- Create the publication if it does not exist (fresh/local projects).
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Ensure full row data on UPDATE/DELETE so the client sees changed columns
-- (e.g. emails.status pending → read).
alter table messages      replica identity full;
alter table emails        replica identity full;
alter table calls         replica identity full;
alter table call_turns    replica identity full;
alter table participants  replica identity full;
alter table inject_fires  replica identity full;

-- ==== 0004_contacts_meta.sql ====

-- =============================================================================
-- The Signal — Phase 1: contacts.meta
--
-- The voice casting sheet carries direction (sex/age/accent/tone/pace + a sample
-- line) that is NOT the LLM persona and NOT yet a concrete ElevenLabs voice_id.
-- Give contacts a jsonb `meta` to hold that casting intent (and any other authoring
-- metadata) so persona stays a clean system-prompt fragment and voice_id stays the
-- concrete provider id (assigned later when ElevenLabs voices are picked).
-- =============================================================================

alter table contacts add column if not exists meta jsonb not null default '{}'::jsonb;

-- ==== 0005_behavioral_spine.sql ====

-- =============================================================================
-- The Signal — Behavioral Memory Spine (design doc: Behavioral Memory Spine.md)
--
-- Three layers. Layer 1 is LOCKED and maximal; Layers 2/3 are VERSIONED and
-- re-computable from Layer 1. Founder decision: the moat is the ENGINE (raw event
-- log + scoring function + longitudinal profile) — so we over-capture now and treat
-- scoring as the instrument.
--
-- This migration runs AFTER 0001-0004 but BEFORE any real capture. The event schema
-- cannot be retrofitted once sessions run; it is locked here first.
--   §1 Layer 1  — enrich + lock `events` (maximal capture, incl. omissions)
--   §2 Layer 2  — trait_registry (v0.1 hypothesis) + trait_scores (versioned)
--   §7 profile  — behavioral_profile (reserved, empty)
--   §8 consent  — consents (capture/retention/de-role legitimacy)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- §1 Layer 1 — the Event Log. LOCK THIS. Append-only (trigger from 0001 stands).
-- Enrich for maximal capture: seat, channel, scenario clock, derived flag.
-- -----------------------------------------------------------------------------

-- Channel the act occurred on (paired with `type`).
create type event_channel as enum ('message', 'group', 'email', 'call', 'doc', 'brief', 'system');

-- `ts` is the canonical server timestamp in the spine's vocabulary. 0001 created
-- this column as `at`; rename for fidelity to the design (no data exists yet).
alter table events rename column at to ts;

alter table events
  add column if not exists seat_id     uuid references seats (id) on delete set null,
  add column if not exists channel     event_channel,
  add column if not exists scenario_ms bigint,      -- ms from session start (scenario clock)
  add column if not exists derived     boolean not null default false;  -- always false in Layer 1

comment on table events is
  'Layer 1 behavioral spine — LOCKED, append-only. One row per observable act OR '
  'omission. No trait judgments here (those live in trait_scores). `type` is open '
  'text: message_sent, message_draft_started, message_draft_discarded, thread_opened, '
  'thread_dwell, thread_ignored, email_read, email_unopened, doc_approved, doc_returned, '
  'doc_edited, call_placed, call_accepted, call_declined, call_missed, call_turn, '
  'brief_opened, brief_never_opened, response_latency, silence, inject_delivered, …';
comment on column events.derived is 'Always false in Layer 1; derived signals live in trait_scores.';

create index if not exists events_seat_id_idx on events (seat_id);
create index if not exists events_channel_idx on events (channel);
-- (session_id, ts) index from 0001 follows the renamed column automatically.

-- -----------------------------------------------------------------------------
-- §2 Layer 2 — the Trait Registry (VERSION, do not lock).
-- The dynamics registry is a hypothesis, not a foundation. New dynamics = new
-- trait_key; a taxonomy revision = new taxonomy_version. Never migrate Layer 1.
-- -----------------------------------------------------------------------------
create table trait_registry (
  trait_key           text not null,
  taxonomy_version    text not null,
  definition          text not null,
  observable_signals  jsonb not null default '[]'::jsonb,
  scoring_rubric_ref  text,               -- pointer to the versioned rubric (code/doc)
  status              text not null default 'hypothesis'
                        check (status in ('hypothesis', 'validated')),
  created_at          timestamptz not null default now(),
  primary key (trait_key, taxonomy_version)
);
comment on table trait_registry is
  'Behavioral dynamics registry. v0.1 is a hypothesis seeded from field anecdotes — '
  'a trait is only a sellable diagnostic once status = validated (inter-rater '
  'reliability measured, §3). Add forever without touching Layer 1.';

-- Derived posture scores. Stored separately, tagged with taxonomy + scorer version
-- so a re-score never destroys history. Every score cites its evidence events.
create table trait_scores (
  id                 uuid primary key default gen_random_uuid(),
  participant_id     uuid not null references participants (id) on delete cascade,
  session_id         uuid not null references sessions (id) on delete cascade,
  taxonomy_version   text not null,
  scorer_version     text not null,      -- model/prompt/rubric version that produced this
  trait_key          text not null,
  value              text,               -- categorical posture (e.g. 'compete')
  value_num          numeric,            -- scalar axis position (e.g. -1..1), nullable
  confidence         numeric not null default 0 check (confidence between 0 and 1),
  evidence_event_ids uuid[] not null default '{}',  -- auditable citation into Layer 1
  coder              text not null default 'ai' check (coder in ('ai', 'human', 'consensus')),
  created_at         timestamptz not null default now(),
  foreign key (trait_key, taxonomy_version) references trait_registry (trait_key, taxonomy_version)
);
create index trait_scores_participant_idx on trait_scores (participant_id, trait_key);
create index trait_scores_session_idx on trait_scores (session_id);
create index trait_scores_version_idx on trait_scores (taxonomy_version, scorer_version);
comment on table trait_scores is
  'Layer 2 — VERSIONED, re-computable from Layer 1 only. Never locked. A re-score '
  'writes new rows (new scorer_version); it never mutates or deletes prior scores.';

-- -----------------------------------------------------------------------------
-- §7 Longitudinal profile — reserve now (empty is fine). One asset, four faces
-- (Director-AI, behavioral twin, NPC gossip/memory, season) — all reads of this.
-- -----------------------------------------------------------------------------
create table behavioral_profile (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references participants (id) on delete cascade,
  org_id            uuid references organizations (id) on delete set null,
  trait_key         text not null,
  taxonomy_version  text not null,
  trajectory_json   jsonb not null default '[]'::jsonb,  -- values across sessions over time
  last_session_id   uuid references sessions (id) on delete set null,
  updated_at        timestamptz not null default now(),
  unique (participant_id, trait_key, taxonomy_version)
);
comment on table behavioral_profile is
  'Layer 2/§7 longitudinal profile — reserved. Powers Director-AI / behavioral twin / '
  'NPC gossip / season, all of which are just reads of the spine.';

-- -----------------------------------------------------------------------------
-- §8 Consent & retention — you are building persistent profiles of named people.
-- Consent + de-role are the legitimacy anchor; design them in now.
-- -----------------------------------------------------------------------------
create table consents (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references participants (id) on delete cascade,
  session_id        uuid references sessions (id) on delete set null,
  consent_capture   boolean not null default false,   -- consent to capture this session
  consent_retention boolean not null default false,   -- consent to longitudinal retention
  retention_scope   text not null default 'session'
                      check (retention_scope in ('session', 'org_longitudinal', 'none')),
  policy_version    text,                              -- which consent/retention policy applied
  granted_at        timestamptz,
  revoked_at        timestamptz,                       -- deletion/withdrawal boundary
  created_at        timestamptz not null default now()
);
create index consents_participant_idx on consents (participant_id);
comment on table consents is
  'Consent & retention scope per participant (§8). The profile is a development tool, '
  'not surveillance: capture/retention require consent; revoked_at bounds retention.';

-- -----------------------------------------------------------------------------
-- RLS — all spine tables are server/facilitator-side. Default deny for browser
-- roles; the service role (server) reads/writes. (Debrief + scoring run server-side.)
-- -----------------------------------------------------------------------------
alter table trait_registry     enable row level security;
alter table trait_scores       enable row level security;
alter table behavioral_profile enable row level security;
alter table consents           enable row level security;

-- -----------------------------------------------------------------------------
-- Seed the v0.1 trait registry (HYPOTHESIS). Rubrics are versioned in code at
-- lib/scoring/registry.ts. Idempotent.
-- -----------------------------------------------------------------------------
insert into trait_registry (trait_key, taxonomy_version, definition, observable_signals, scoring_rubric_ref, status) values
  ('compete_vs_collaborate', 'v0.1',
   'Assumes rivalry absent explicit permission to collaborate.',
   '["messages out-group seat unprompted","proposes joint action","withholds a shareable resource"]'::jsonb,
   'lib/scoring/registry.ts#compete_vs_collaborate', 'hypothesis'),
  ('trust_vs_suspect', 'v0.1',
   'Speed to blame / look for fault under stress.',
   '["assigns fault before facts","requests verification of others","language of suspicion"]'::jsonb,
   'lib/scoring/registry.ts#trust_vs_suspect', 'hypothesis'),
  ('frame_taker_vs_questioner', 'v0.1',
   'Accepts given assumptions or interrogates them.',
   '["acts on the brief as stated","questions the premise/deadline","reframes the ask"]'::jsonb,
   'lib/scoring/registry.ts#frame_taker_vs_questioner', 'hypothesis'),
  ('hoard_vs_share', 'v0.1',
   'Under scarcity, hoards or shares material information/resources.',
   '["surfaces private info to the group","times disclosure late","keeps a back channel"]'::jsonb,
   'lib/scoring/registry.ts#hoard_vs_share', 'hypothesis'),
  ('verify_vs_act_on_belief', 'v0.1',
   'Under ambiguity / authority pressure, verifies or acts on belief.',
   '["seeks confirmation before committing","acts on an unverified claim","defers to authority instruction"]'::jsonb,
   'lib/scoring/registry.ts#verify_vs_act_on_belief', 'hypothesis'),
  ('continuity_vs_drop', 'v0.1',
   'Preserves or drops handoffs (the Care Cart axis).',
   '["closes an open loop","leaves a demand unanswered at session end","hands off explicitly"]'::jsonb,
   'lib/scoring/registry.ts#continuity_vs_drop', 'hypothesis'),
  ('status_behavior', 'v0.1',
   'How they treat lower-status / out-group members.',
   '["responds to lower-status contacts","ignores out-group demands","tone shift by status"]'::jsonb,
   'lib/scoring/registry.ts#status_behavior', 'hypothesis')
on conflict (trait_key, taxonomy_version) do nothing;

-- ==== 0006_casting_reservation.sql ====

-- =============================================================================
-- The Signal — Casting reservation (Vision & Roadmap, Horizon 0: "unified engine
-- + casting — seat ≠ participant; every seat Human-or-AI").
--
-- RESERVE NOW, don't build. The roadmap's discipline: reserve the hooks (profile,
-- casting, event richness) now so no later horizon needs a migration. Profile and
-- event richness are already reserved (0005); this reserves CASTING.
--
-- Model: a `participants` row is the OCCUPANT of a seat in a session — human OR AI.
--   * human seat: cast_kind='human', token set (magic link), agent_json = {}
--   * AI seat:    cast_kind='ai',    token null (no link),   agent_json = {config}
-- The full casting UX/orchestration is a later build; here we only ensure the schema
-- can express an AI-cast seat without a migration.
-- =============================================================================

-- An occupant is a human or an AI agent (extensible later, e.g. 'confederate').
create type cast_kind as enum ('human', 'ai');

alter table participants
  add column if not exists cast_kind  cast_kind not null default 'human',
  -- AI occupant config (persona ref, model, voice_id, autonomy level, …). Empty for humans.
  add column if not exists agent_json jsonb not null default '{}'::jsonb;

-- AI-cast seats have no magic-link token. Humans still do; token stays unique.
alter table participants alter column token drop not null;

comment on table participants is
  'Seat OCCUPANT for one session — human OR AI (seat ≠ participant). cast_kind + '
  'agent_json reserve the Human-or-AI casting hook (Roadmap Horizon 0); token is the '
  'human magic-link (null for AI seats). unique(session_id, seat_id) still binds one '
  'occupant per seat.';
comment on column participants.cast_kind is 'human = real person via magic link; ai = agent-cast seat.';
comment on column participants.agent_json is 'AI-cast seat config (persona/model/voice/autonomy). Empty for humans.';

-- ==== 0007_email_decisions.sql ====

-- =============================================================================
-- The Signal — Phase 4: document decisions on emails.
--
-- Emails can carry a document (attachment) the participant Approves / Returns /
-- Edits. The capture log (events: doc_approved | doc_returned | doc_edited) is the
-- canonical record; these columns denormalize the terminal decision onto the email
-- so the UI and debrief can render it without replaying the event log.
-- =============================================================================

alter table emails
  add column if not exists decision      text
    check (decision in ('approved', 'returned')),   -- terminal decision (edit is not terminal)
  add column if not exists decision_json jsonb not null default '{}'::jsonb,  -- reason, edited body, …
  add column if not exists decided_at    timestamptz;

comment on column emails.decision is
  'Terminal document decision (approved|returned). Edits are non-terminal and live in '
  'decision_json + doc_edited events. The events table is the canonical capture.';

-- ==== 0008_inject_resolution.sql ====

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

-- ==== 0009_solo_engine.sql ====

-- =============================================================================
-- The Signal / TLFS — Master Build Handoff §5: solo-engine schema.
--
-- Solo and team are ONE engine cast differently (Build Update §1-2, Addendum A3).
-- The team capture model (events + A1 inject_resolution + directed edges) already
-- covers everything the solo engine needs to CAPTURE — A3 is explicit: "no new raw
-- capture beyond A1." What the solo real-time engine adds is *authored content* and
-- *structured Layer-2 reads* of a run, layered on the append-only `events` log:
--
--   scenario_meta  — real-time structure (weeks/pacing) + driver keys (authored)
--   holds          — authored held-information "landmines" (authored)
--   run_drivers    — per-run world-model driver values the referee moves (derived)
--   rulings        — AI referee rulings on free-text decisions (derived)
--   run_outcome    — branch + ending resolved per run (derived)
--
-- `events` remains the source of truth; these are versioned interpretations/authored
-- content, never raw capture — same Layer-1/2/3 separation as the spine.
-- Additive migration: nothing here is referenced by the current app yet.
-- =============================================================================

create type session_mode as enum ('solo', 'team');
create type ending_tone  as enum ('hero', 'villain', 'mixed');

-- Real-time structure + drivers for a scenario (authored). One row per scenario.
create table scenario_meta (
  scenario_id  uuid primary key references scenarios (id) on delete cascade,
  mode_default session_mode not null default 'team',
  driver_keys  jsonb not null default '[]'::jsonb,   -- e.g. ["trust","people","business","continuity"]
  week_count   integer,                              -- real-time acts/weeks
  week_seconds integer,                              -- real-time pacing (seconds per week)
  created_at   timestamptz not null default now()
);

-- Authored held information: the landmine a seat holds until asked (authored content).
create table holds (
  id                  uuid primary key default gen_random_uuid(),
  scenario_id         uuid not null references scenarios (id) on delete cascade,
  week_idx            integer,
  holder_seat_id      uuid references seats (id) on delete cascade,
  topic               text,
  trigger_hints       jsonb not null default '[]'::jsonb,  -- phrases a real ask must hit to surface it
  hedge_text          text,                                -- guarded/partial reveal under low trust
  reveal_text         text,                                -- full reveal on a targeted ask
  critical            boolean not null default false,
  counterfactual_text text,                                -- shown in debrief if never surfaced
  created_at          timestamptz not null default now()
);
create index holds_scenario_idx on holds (scenario_id);

-- Per-run world state: the drivers the referee moves each week (derived Layer-2).
create table run_drivers (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references sessions (id) on delete cascade,
  participant_id uuid references participants (id) on delete cascade,
  week_idx       integer not null,
  driver_key     text not null,
  value          numeric,
  delta          numeric,
  at             timestamptz not null default now(),
  unique (session_id, participant_id, week_idx, driver_key)
);
create index run_drivers_session_idx on run_drivers (session_id);

-- AI referee rulings on free-text decisions — the core solo signal (derived Layer-2).
create table rulings (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references sessions (id) on delete cascade,
  participant_id   uuid references participants (id) on delete cascade,
  week_idx         integer,
  decision_text    text,
  narrative        text,
  dimension_scores jsonb not null default '{}'::jsonb,  -- discern/courage/people/truth/…
  conduct          jsonb not null default '{}'::jsonb,  -- who asked, who ignored, holds surfaced
  branch_key       text,
  buzzer           boolean not null default false,
  at               timestamptz not null default now()
);
create index rulings_session_idx on rulings (session_id);
create index rulings_participant_idx on rulings (participant_id);

-- Branch + ending resolved per run (derived Layer-2).
create table run_outcome (
  session_id     uuid not null references sessions (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  branch_key     text,
  ending_key     text,
  ending_tone    ending_tone,
  verdict        text,
  survived       boolean,
  at             timestamptz not null default now(),
  primary key (session_id, participant_id)
);

-- A3.1 — Director-eligible inject trigger conditions (time / event-pattern /
-- resolution-state). Reserved: the Director-AI evaluates these to re-time/target/
-- conditionally release injects; scripted timing (payload_json.delay_min/cond) stays
-- the deterministic fallback when the Director is off/unavailable.
alter table injects add column if not exists trigger_json jsonb not null default '{}'::jsonb;

-- RLS — all solo-engine tables are server/facilitator side. Default deny for browser.
alter table scenario_meta enable row level security;
alter table holds         enable row level security;
alter table run_drivers   enable row level security;
alter table rulings       enable row level security;
alter table run_outcome   enable row level security;

comment on table rulings is
  'Master Handoff §5 — AI-referee rulings on free-text decisions. Derived Layer-2 '
  '(versioned interpretation), read from the raw events log; never raw capture.';
comment on table holds is
  'Master Handoff §5 — authored held-information landmines. Surface on a targeted ask '
  '(reveal_text), hedge under low trust (hedge_text), or return as counterfactual.';

-- ==== 0010_run_config.sql ====

-- =============================================================================
-- Run-level config (Addendum A3.2) — disposition is a RUN dial, not a seat attribute.
--
-- The scenario declares the available NPC dispositions (served | on-request |
-- guarded | surprise) in its content; a *run* picks one that governs the NPCs, and
-- per A3.2 the *effective* disposition resolves per (npc_seat × participant) from the
-- behavioral_profile at runtime (trust carried in). None of that belongs on a seat
-- row — it lives on the session.
--
--   sessions.run_config holds the run default (+ facilitator overrides), e.g.
--   { "disposition": "guarded" }. The Director/referee reads it, then lets the
--   per-(npc × participant) profile read override it once profiles have history.
-- =============================================================================

alter table sessions add column if not exists run_config jsonb not null default '{}'::jsonb;

comment on column sessions.run_config is
  'Run-level dials (A3.2): chosen NPC disposition (served|request|guarded|surprise) '
  'and other per-run settings. Effective disposition is resolved per (npc_seat × '
  'participant) from behavioral_profile at runtime; this is the run default/override.';

-- ==== seed.sql ====

-- =============================================================================
-- The Signal — seed (Champion Iron executive team scenario, v1.0)
--
-- GENERATED FILE — do not edit by hand. Edit scripts/seed/build_seed.mjs and run:
--     node scripts/seed/build_seed.mjs
--
-- Message bodies are verbatim from the scenario document (org/place names normalized
-- to the canonical "Nordveil Iron AS" / "Fermont"). ElevenLabs voice_id is set per the
-- casting sheet; voice casting direction is also retained in contacts.meta.voice.
-- =============================================================================

begin;

-- Idempotent reseed: clear authored content + demo run for this scenario.
delete from events       where session_id in (select id from sessions where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35');
delete from participants where session_id in (select id from sessions where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35');
delete from sessions     where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35';
delete from injects      where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35';
delete from documents    where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35';
delete from contacts     where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35';
delete from seats        where scenario_id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35';
delete from scenarios    where id = 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35';
delete from organizations where id = '47a58f37-fe8f-52ba-93ef-f24bfbf67398';

-- organizations
insert into organizations (id, name) values ('47a58f37-fe8f-52ba-93ef-f24bfbf67398', 'Champion Iron');

-- scenarios
insert into scenarios (id, org_id, title, summary) values ('aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '47a58f37-fe8f-52ba-93ef-f24bfbf67398', 'The Signal', 'Leadership Failure Simulator — Champion Iron Executive Team. A senior federal representative offers Champion a time-sensitive green-industrial partnership requiring a coordinated executive response within 72 hours. Every team member holds domain-specific knowledge material to the decision; whether, when, and to whom they share it is what the simulation measures.');

-- seats
insert into seats (id, scenario_id, key, name, role, meta) values ('6779202e-6554-52f6-947b-a2ec6948283f', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'david', 'David Cataford', 'CEO', '{"brief_document_key":"brief_david"}'::jsonb);
insert into seats (id, scenario_id, key, name, role, meta) values ('a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'alex', 'Alexandre Belleau', 'COO', '{"brief_document_key":"brief_alex"}'::jsonb);
insert into seats (id, scenario_id, key, name, role, meta) values ('d063f014-6d9e-5160-95c5-31ce8e6a72ee', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'steve', 'Steve Boucratie', 'SVP General Counsel & Corporate Secretary', '{"brief_document_key":"brief_steve"}'::jsonb);
insert into seats (id, scenario_id, key, name, role, meta) values ('1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'michael', 'Michael Marcotte', 'SVP Corporate Development & Capital Markets', '{"brief_document_key":"brief_michael"}'::jsonb);
insert into seats (id, scenario_id, key, name, role, meta) values ('792365e5-4031-52c2-8913-309208319114', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'francois', 'François Rhéaume', 'SVP Strategy', '{"brief_document_key":"brief_francois"}'::jsonb);
insert into seats (id, scenario_id, key, name, role, meta) values ('3dbbb068-64fc-5cea-8e07-78579d6301bc', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'angela', 'Angela Frenette', 'VP Human Resources & Indigenous Relations', '{"brief_document_key":"brief_angela"}'::jsonb);
insert into seats (id, scenario_id, key, name, role, meta) values ('a6f27fab-2984-5a44-8138-559d4d92167f', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'noemi', 'Noémie Charlebois', 'Director, Communications & Government Affairs', '{"brief_document_key":"brief_noemi"}'::jsonb);

-- contacts
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('9e3d80f0-22bb-5eea-948b-744743315eb8', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'paul_arsenault', 'Paul Arsenault', 'Senior Advisor, Office of the Minister of Natural Resources', 'EXTERNAL', '#3b82f6', true, 'You are Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Professional, measured, genuinely wants this partnership to work. A smooth, polished political operator — friendly and enthusiastic on the surface with quiet, persistent pressure underneath. You push for clarity and decisiveness and you will not wait; you represent the external Thursday-5pm deadline. Never rattled.', 'mrh6BGtvw1pAXXEjlsOg', 'David — glad I caught you. I take it you have had a chance to look at the letter?', '{"voice":{"sex":"male","age":"50s","accent":"Canadian English, faint Québécois warmth","tone":"smooth, polished, quiet pressure","pace":"measured, unhurried"},"shared_with":["alex"]}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('85ee0b0d-bb23-55fb-855c-be7be05b4123', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'robert_vaillancourt', 'Robert Vaillancourt', 'Board Chair, Champion Iron', 'INTERNAL', '#8b5cf6', true, 'You are Robert Vaillancourt, Board Chair of Champion Iron. Senior, authoritative, a little terse. You have heard of a possible federal partnership announcement and feel out of the loop; board protocol is clear that you must be informed before anything material goes public. Controlled irritation, deliberate and weighty.', '4a0Khp1o5b79Ilkuf4ia', 'David. Good — I have been trying to reach you. What is going on with this federal business?', '{"voice":{"sex":"male","age":"early 60s","accent":"Canadian English","tone":"authoritative, controlled irritation","pace":"deliberate, weighty"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('66eb0566-6317-5584-bc54-0ed4d809927c', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'gunnar_olsen', 'Gunnar Olsen', 'CEO, Nordveil Iron AS (Nordic subsidiary)', 'INTERNAL', '#10b981', true, 'You are Gunnar Olsen, CEO of Nordveil Iron AS, Champion’s Nordic subsidiary. Calm, practical, measured, even-keeled operator. You are seeking direction on a routine-but-sensitive union meeting request about Q3 shift schedule changes.', '6XVxc5pFxXre3breYJhP', 'David, thanks for calling back. It is about the union meeting request.', '{"voice":{"sex":"male","age":"50s","accent":"Scandinavian-accented English (Norwegian)","tone":"calm, practical","pace":"measured"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('5f23b3ce-49d2-5cbb-9da8-64a220019581', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'christian_levesque', 'Christian Lévesque', 'Director of Operations, Champion Iron', 'INTERNAL', '#10b981', true, 'You are Christian Lévesque, Director of Operations at Champion Iron and Alex’s direct report. Competent, not alarmist, grounded and plain-spoken — a field/operations voice, not a boardroom one. You hold specific data: a Q4 water-management permit variance for the Phase 2 northern expansion is still pending provincial review, unlikely to resolve before September. It only becomes material if Champion makes public commitments about northern capacity or Phase 2 timelines. You only engage with Alex.', 'GWX9un23nl5PmLT9bXtH', 'Alex — Christian here. You got a minute on the Phase 2 thing?', '{"voice":{"sex":"male","age":"40s–50s","accent":"Québécois English","tone":"grounded, plain-spoken, operational","pace":"steady"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('272cfb69-9ee0-51a8-bd81-8b2eba457301', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'paul_arsenault', 'Paul Arsenault', 'Senior Advisor, Office of the Minister of Natural Resources', 'EXTERNAL', '#3b82f6', true, 'You are Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Smooth, polished, measured political operator. You are pressing Alex directly for an operational capacity summary for the preliminary package. Friendly but persistent; you will not wait.', 'mrh6BGtvw1pAXXEjlsOg', 'Alex — Paul Arsenault. Thanks for taking the call. I need the operational capacity picture.', '{"voice":{"sex":"male","age":"50s","accent":"Canadian English, faint Québécois warmth","tone":"smooth, polished, quiet pressure","pace":"measured, unhurried"},"shared_with":["david"]}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('912acb65-0ca1-59f7-8068-52dda26486a0', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'bloom_lake_ops', 'Bloom Lake Operations', 'Site operations desk', 'INTERNAL', '#64748b', false, null, null, null, '{"type":"desk","text_only":true}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('941c78ca-34c6-5f53-9980-9ee512cfa8a5', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'marc_beauchemin', 'Marc Beauchemin', 'External Legal Counsel', 'EXTERNAL', '#3b82f6', true, 'You are Marc Beauchemin, Steve’s external legal counsel. Precise, careful, measured; risk-focused but solution-oriented and not political. You flagged that a federal public-private partnership with co-investment above $50M triggers a mandatory lender notification within 30 days, measured from the date of public announcement. This is procedural and solvable — lenders will almost certainly consent — but if the announcement precedes notification, Champion is in technical default. The fix is sequencing/timing (a ~15-day buffer). You only engage with Steve.', 'ro97IE6kwE2PXqdaUoPE', 'Steve — Marc. Thanks for calling. I want to walk you through the notification timing.', '{"voice":{"sex":"male","age":"50s","accent":"Canadian English","tone":"precise, careful, lawyerly restraint","pace":"deliberate"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('43c062c3-ce3e-57aa-901b-8778b530f543', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'marie_pierre', 'Marie-Pierre Gauthier', 'Securities Compliance, Champion Iron', 'INTERNAL', '#10b981', true, 'You are Marie-Pierre Gauthier, Securities Compliance at Champion Iron. Exacting, formal, by-the-book; clipped and efficient. You need Steve’s sign-off on the Q2 securities compliance certification, due to the securities commission Friday.', 'sBYwotm75akIFTqdVCPT', 'Steve — Marie-Pierre. I need the Q2 certification signed today, please.', '{"voice":{"sex":"female","age":"40s","accent":"Canadian/Québécois English","tone":"exacting, formal, by-the-book","pace":"clipped, efficient"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('b31bc666-e91c-5c01-acd0-89da51224f58', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'jonas_hartmann', 'Jonas Hartmann', 'Institutional Investor Contact', 'EXTERNAL', '#f59e0b', true, 'You are Jonas Hartmann, Michael’s institutional investor contact. Sharp, fast, market-savvy; direct and slightly impatient, used to getting answers. Market-oriented, opportunistic framing about CBAM and the low-carbon iron-ore offtake premium. You only engage with Michael.', 'lxvPH8fNJQrOdR4brk0c', 'Michael — Jonas. Quick one. The CBAM window is moving — do you want the numbers?', '{"voice":{"sex":"male","age":"40s","accent":"International/European-accented English (German lean)","tone":"sharp, fast, impatient","pace":"fast"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('a26eee33-1be2-5836-9f48-efcf53a81074', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'voss_stahl', 'K. Vogel — Voss Stahl GmbH', 'European Steel Mill (German industrial buyer)', 'EXTERNAL', '#f59e0b', true, 'You are K. Vogel of Voss Stahl GmbH, a German industrial steel buyer seeking a Canadian low-carbon iron-ore supply relationship. Formal, industrial, precise; German-accented English. You contacted Michael directly about a preliminary supply conversation this week.', 'A9evEp8yGjv4c3WslKuY', 'Mr. Marcotte — Vogel, Voss Stahl. Thank you for taking the call.', '{"voice":{"sex":"male","age":"40s–50s","accent":"German-accented English","tone":"formal, industrial, precise","pace":"even","note":"gender-neutral name; default male"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('1585971e-61d5-5f01-b7d5-7a57df47b1c4', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'finance_team', 'Corporate Finance', 'Internal finance team desk', 'INTERNAL', '#64748b', false, null, null, null, '{"type":"desk","text_only":true}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('7742adcc-8486-5ed9-b2c5-c4adac700f1d', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '792365e5-4031-52c2-8913-309208319114', 'jean_philippe_caron', 'Jean-Philippe Caron', 'Personal contact, federal government-adjacent', 'EXTERNAL', '#3b82f6', true, 'You are Jean-Philippe Caron, François’s personal contact in a federal government-adjacent role (a former colleague). Warm, discreet insider — you speak low and friendly, a "between us" tone, and you will not put anything sensitive in writing. You can offer informal context on how the minister’s office is really thinking. You only engage with François.', 'xTZImU8dKXdyk4XGYGFg', 'Frank — good to hear your voice. We should keep this one between us.', '{"voice":{"sex":"male","age":"40s–50s","accent":"Québécois English","tone":"warm, discreet insider","pace":"relaxed"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('aa9b1a41-6216-50b2-ae34-7d23fc4edfa3', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '792365e5-4031-52c2-8913-309208319114', 'corporate_records', 'Corporate Records', 'Records desk', 'INTERNAL', '#64748b', false, null, null, null, '{"type":"desk","text_only":true,"note":"Legacy Saudi-initiative sign-off (brief context); no authored message copy in v1.0."}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('9902f7a3-bd9a-5dc8-865b-447618ca3ff1', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'daniel_lefebvre', 'Daniel Lefebvre', 'Stakeholder Review, Natural Resources Canada', 'EXTERNAL', '#3b82f6', true, 'You are Daniel Lefebvre, Stakeholder Review at Natural Resources Canada, reaching out on behalf of Paul Arsenault’s office to compile a preliminary stakeholder-relations summary. Bureaucratic, neutral, procedural; even and slightly flat, process-driven.', '6rr4jpS124uCLNtgVdAk', 'Hello — Daniel Lefebvre, Natural Resources Canada. I am following up on the consultation summary.', '{"voice":{"sex":"male","age":"40s–50s","accent":"Canadian English","tone":"bureaucratic, neutral, procedural","pace":"even, slightly flat"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('f05a4ddd-02d9-5238-ab73-62966a5cf824', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'sorensen', 'K. Sørensen', 'HR Director, Nordveil Iron AS', 'INTERNAL', '#10b981', true, 'You are K. Sørensen, HR Director at Nordveil Iron AS. Measured, professional, calm; Scandinavian-accented English. You need Angela’s guidance aligning Q3 performance-review processes amid cultural friction points.', '1akQNyt9mMzTni2Y99lv', 'Angela — Sørensen here. Do you have a few minutes on the Q3 review process?', '{"voice":{"sex":"female","age":"40s","accent":"Scandinavian-accented English","tone":"measured, professional, calm","pace":"even","note":"gender-neutral name; default female"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('b17b46f1-9b68-52f8-ab2c-25d68a7b77b1', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'stakeholder_system', 'Stakeholder Management System', 'Automated reminder feed', 'INTERNAL', '#64748b', false, null, null, null, '{"type":"desk","text_only":true,"automated":true}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('99697ad7-d55e-57eb-a0de-6eb1559184af', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'helene_mercier', 'Hélène Mercier', 'Communications Director, Ministry of Natural Resources', 'EXTERNAL', '#3b82f6', true, 'You are Hélène Mercier, Communications Director at the Ministry of Natural Resources and Noémie’s contact. Polished, media-savvy, careful — you weigh every word. Collegial; you give Noémie real information but expect discretion. You only engage with Noémie.', 'l2qjqoUskg4poHSh4wMx', 'Noémie — Hélène. Between us, this is moving faster than the team thinks.', '{"voice":{"sex":"female","age":"40s–50s","accent":"Québécois/Canadian English","tone":"polished, media-savvy, careful","pace":"smooth, controlled"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('8f113b9c-9879-52f2-97f7-32d58f1986eb', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'claude_gagnon', 'Claude Gagnon', 'General Manager, Fermont Operations', 'INTERNAL', '#10b981', true, 'You are Claude Gagnon, General Manager of Fermont Operations. Blunt, direct, field-manager candor; strong Québécois English, no polish — you say it straight. You are worried local media will connect federal-announcement rumours to Champion while the fly-in/fly-out tension is still raw, and you need to know what to tell them.', '4GFYeFHbunxgGi5kJX68', 'Noémie — Claude. I am getting calls. What do I tell people?', '{"voice":{"sex":"male","age":"50s","accent":"strong Québécois English","tone":"blunt, direct, field-manager candor","pace":"plain"}}'::jsonb);
insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values ('fd97092d-7b2b-5655-976b-8c6cf9bb437c', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'comms_team', 'Communications Team', 'Internal communications desk', 'INTERNAL', '#64748b', false, null, null, null, '{"type":"desk","text_only":true}'::jsonb);

-- documents
insert into documents (id, scenario_id, key, title, meta, body_json) values ('8a196c9d-6a71-55f0-a282-8668f8eecef9', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'opening_brief', 'Opening Brief — The Signal', '{"type":"opening_brief","audience":"all","time":"07:45 AM, Tuesday"}'::jsonb, '{"type":"opening_brief","text":"07:45 AM, Tuesday\n\nThis morning David received a call from Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Canada is under significant international pressure to demonstrate a credible green industrial strategy ahead of a major G7 trade summit in 90 days. Arsenault''s office is looking for a Canadian iron ore producer to anchor a national initiative — a public-private partnership that would accelerate feasibility work on next-generation iron ore processing, position Canadian supply chains as preferred partners for low-carbon steel production in Europe and Asia, and generate a significant federal co-investment commitment.\n\nChampion Iron has been identified as the preferred partner. The opportunity includes federal co-investment in ongoing feasibility work, preferred introductions to three major international steel producers actively seeking low-carbon supply agreements, and a public announcement at the G7 summit positioning Champion as Canada''s strategic anchor in the green steel transition.\n\nArsenault needs a preliminary letter of intent by Thursday at 5pm — 58 hours from now. After that, the ministry moves to a broader industry consultation and Champion loses first-mover position.\n\nDavid has called the full executive team together. This message is going to all of you simultaneously. He wants a decision on whether to pursue, and if yes, a coordinated response plan, by end of day."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('76c0fe47-2d38-5bd3-853d-1b1ac586ea91', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_david', 'Your Brief — David Cataford (CEO)', '{"type":"role_brief","seat":"david","persistent":true}'::jsonb, '{"type":"role_brief","seat":"david","name":"David Cataford","role":"CEO","text":"BRIEF — DAVID CATAFORD — CEO\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nThree days ago you received a call from Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Canada is under significant pressure from its G7 partners to demonstrate a credible green industrial strategy ahead of the summit in 90 days. Arsenault''s office has identified Champion Iron as the preferred anchor for a national green steel initiative.\n\nThe opportunity on the table:\n- Federal co-investment of approximately $75-100M toward CAMI feasibility acceleration\n- Preferred introductions to three major European steel mills actively seeking low-carbon supply agreements ahead of EU carbon border tariffs\n- A public announcement at the G7 summit positioning Champion as Canada''s strategic iron ore partner for the green transition\n- A 10-year preferred supplier framework with federal procurement priority for domestic infrastructure projects\n\nThe condition: Champion must provide a preliminary letter of intent by Thursday at 5pm — 58 hours from now. After that the ministry moves to broader industry consultation and Champion loses first-mover position.\n\nWhat you don''t know:\nYou don''t know whether Champion''s Indigenous and community consultation track record is clean enough to survive federal due diligence. Arsenault mentioned it in passing this morning as a standard requirement. You haven''t asked anyone on your team yet.\nYou don''t know whether your current financing structure creates any obligations or constraints around a public-private partnership of this scale.\nYou don''t know whether Champion''s operational capacity commitments can support what a federal partnership announcement would imply.\nYou don''t know that Noemi had advance intelligence about this opportunity from her own government network before your call this morning.\nYou don''t know that Francois has a personal relationship with someone connected to the minister''s office.\n\nWhat you''re deciding today:\nWhether to pursue this opportunity, and if yes, how to organize Champion''s response in the next 58 hours.\n\nOne thing to keep in mind:\nArsenault suggested keeping the circle small internally for now. His exact words: \"These things have a way of getting complicated when too many people are involved before the framework is settled.\" What you do with that advice is your call."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('6d5cf994-35de-5b6d-8b69-f029e3ce0f19', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_alex', 'Your Brief — Alexandre Belleau (COO)', '{"type":"role_brief","seat":"alex","persistent":true}'::jsonb, '{"type":"role_brief","seat":"alex","name":"Alexandre Belleau","role":"COO","text":"BRIEF — ALEXANDRE BELLEAU — COO\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nYou are hearing about the federal partnership opportunity at the same time as the rest of the team. David called everyone together this morning.\n\nWhat you know that nobody else does:\nThree weeks ago your Director of Operations flagged a water management permit variance on the northern expansion. Specifically: a permit variance application filed in Q4 of last year for the Phase 2 water management infrastructure is still pending provincial review. The permits team estimates resolution is unlikely before September at the earliest.\nThis has not been a problem until now because the variance doesn''t affect current operations. Bloom Lake is running normally. The issue only becomes material if Champion makes public commitments about northern expansion capacity or Phase 2 timelines to external parties.\nA federal partnership announcement that references CAMI feasibility acceleration or expanded production capacity could create a gap between what Champion commits publicly and what the permits actually allow. That gap is manageable — but only if someone with authority knows about it before commitments are made, not after.\nYou have been treating this as an operational detail. Until this morning, it was.\n\nWhat you''re managing simultaneously:\nBloom Lake has a routine but time-sensitive contractor approval on your desk. The conveyor maintenance crew needs a 3-week extension signed off today or they begin demobilization. Cost is within pre-approved variance. It''s a 10-minute task but it requires your attention.\n\nWhat you''re deciding today:\nWhen to surface the permit variance, to whom, and how. And whether you stay in the strategic conversation or get pulled back into operations.\n\nOne thing to keep in mind:\nYou are one of two people David trusts completely. That means your instinct will be to handle things — to solve the permit problem yourself before surfacing it, to manage the Arsenault capacity question directly, to take on more than you should. The question is whether that instinct serves the team today or just serves your comfort with being needed."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('572de02e-20ba-52c4-871c-5c50abebd650', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_steve', 'Your Brief — Steve Boucratie (SVP General Counsel & Corporate Secretary)', '{"type":"role_brief","seat":"steve","persistent":true}'::jsonb, '{"type":"role_brief","seat":"steve","name":"Steve Boucratie","role":"SVP General Counsel & Corporate Secretary","text":"BRIEF — STEVE BOUCRATIE — SVP GENERAL COUNSEL AND CORPORATE SECRETARY\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nYou are hearing about the federal partnership opportunity at the same time as the rest of the team.\n\nWhat you know that nobody else does:\nLast month, during a routine financing review, your external legal counsel flagged a clause in Champion''s current syndicated credit facility. The relevant provision: any public-private partnership involving federal co-investment above $50M triggers a mandatory lender notification requirement. The notification must be filed within 30 days of a binding letter of intent — but critically, the 30-day window is measured from the date of public announcement, not the date of signing.\nThis means: if Champion signs a letter of intent Thursday and it becomes public — which a G7 announcement would — the 30-day notification clock starts immediately. If Champion''s communications team announces the partnership before the notification is filed, Champion is in technical default on its credit facility at the precise moment of its most significant public announcement in years.\nThis is not a deal-breaker. Lender consent in situations like this is routine and expected. The lenders will almost certainly approve. The risk is entirely procedural: wrong sequence, wrong timing, technical default. The fix requires coordinating the announcement timeline with the lender notification process. That''s a 15-day buffer built into the communications plan. Simple to manage. Catastrophic if missed.\nYou are the only person on the executive team who currently knows this.\n\nWhat you''re managing simultaneously:\nThe Q2 compliance certification for the securities commission is due Friday. Your team has the draft ready and needs your sign-off today to meet the print deadline. It is routine but non-negotiable.\n\nWhat you''re deciding today:\nWhen to raise the financing constraint, how to frame it, and whether you give the room something to work with or something to worry about.\n\nOne thing to keep in mind:\nYou already know how your concerns tend to land in the room. You know that David finds your style frustrating even when your substance is right. This morning you have a concern that is genuinely important and genuinely solvable. The question isn''t whether to raise it. The question is whether you raise it in a way that helps the decision or stops it. The lenders will say yes. The timeline just needs to be managed. That''s the whole message. Everything else is noise."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('73b3ea19-dd2d-5cd1-a4c3-dab613c32428', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_michael', 'Your Brief — Michael Marcotte (SVP Corporate Development & Capital Markets)', '{"type":"role_brief","seat":"michael","persistent":true}'::jsonb, '{"type":"role_brief","seat":"michael","name":"Michael Marcotte","role":"SVP Corporate Development & Capital Markets","text":"BRIEF — MICHAEL MARCOTTE — SVP CORPORATE DEVELOPMENT AND CAPITAL MARKETS\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nYou are hearing about the federal partnership opportunity at the same time as the rest of the team. However, you are less surprised than most.\n\nWhat you know that nobody else does:\nSix weeks ago you built a financial model for a different purpose — assessing Champion''s positioning relative to European carbon border adjustment mechanisms and the emerging low-carbon iron ore premium. You were tracking three European steel mills that have been quietly accelerating their low-carbon feedstock sourcing timelines. The model was never formally presented because the context didn''t feel right. It has been sitting in your files. That model maps almost exactly to what this federal partnership opportunity requires.\n\nThe numbers as you currently have them:\nDownside case: Federal co-investment of $75M, one offtake agreement at a 4% premium to spot, CAMI feasibility acceleration of 18 months. Net present value impact to Champion: approximately $180M over 10 years.\nBase case: Federal co-investment of $100M, two offtake agreements at 6% premium to spot, CAMI acceleration of 24 months. NPV impact: approximately $340M over 10 years.\nUpside case: Full federal co-investment package, three offtake agreements at 8-10% premium, CAMI as anchor of national green steel strategy. NPV impact: $500M+ over 10 years with significant option value on future federal procurement.\nThese numbers are directionally right but carry significant uncertainty. The offtake premium assumptions in particular depend on how quickly the European mills move and whether Champion can credibly commit to a low-carbon narrative that survives due diligence.\n\nWhat you''re managing simultaneously:\nThe Q2 management accounts are ready for board review. The board package goes to print Thursday morning and needs your sign-off today. Your finance team is waiting.\nYou will also likely receive direct outreach from an external party about the partnership opportunity during the simulation. You have not been authorized to have that conversation.\n\nWhat you''re deciding today:\nWhat to share, how much of it, and when. The model exists. The question is whether you give the room what it needs to make a decision or everything you know.\n\nOne thing to keep in mind:\nDavid has asked you directly for numbers before and told you the output was hard to use. His words, not yours. Three numbers — upside, base, downside — is what a room making a 58-hour decision needs. Everything else can come later. The CFO question is unresolved. This morning is not an audition. But it is being watched."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('a7742c19-86fc-5958-af02-61608ade568d', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_francois', 'Your Brief — François Rhéaume (SVP Strategy)', '{"type":"role_brief","seat":"francois","persistent":true}'::jsonb, '{"type":"role_brief","seat":"francois","name":"François Rhéaume","role":"SVP Strategy","text":"BRIEF — FRANCOIS RHEAUME — SVP STRATEGY\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nYou are hearing about the federal partnership opportunity at the same time as the rest of the team. But three days ago you heard something that made you suspect something like this was coming.\n\nWhat you know that nobody else does:\nThree days ago a personal contact — someone you worked with at a previous company who now works in a federal government-adjacent role — mentioned obliquely that something was moving in the natural resources space at the ministerial level. He didn''t say more. You started putting pieces together. You have not said anything to David.\nThis morning your contact sent you a follow-up. He now knows Champion is involved. He is offering to provide informal context about how the minister''s office is thinking about this initiative — what they actually want from a partner beyond the public framing, who the internal decision-makers are, and what the real evaluation criteria look like beyond the stated ones.\nThis relationship is potentially valuable. It is also a potential conflict of interest. If it becomes known that you had advance intelligence and a back channel into the minister''s office without disclosing it, the optics are problematic regardless of your intentions.\nYour contact has also told you, privately, that your name came up in the minister''s office in connection with this initiative. Someone there knows you from your previous work. He is advising you to get ahead of it.\n\nWhat you''re managing simultaneously:\nA legacy matter from the Saudi initiative requires your sign-off today. It is administrative and low stakes but it carries emotional weight. You stewarded that project. It failed for reasons outside your control. The paperwork is a reminder.\n\nWhat you''re deciding today:\nWhether to disclose the relationship to David and the team immediately, use the back channel quietly to advance Champion''s position, or wait until you understand the full picture before saying anything.\n\nOne thing to keep in mind:\nYou are the person everyone trusts. That trust has been built over years and it is real. It is also fragile in the specific way that all trust built on composure is fragile — it depends on the assumption that your composure reflects nothing hidden. You have something hidden right now. The question is not whether it surfaces. It will. The question is whether you surface it or it surfaces you."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('00340014-0378-5ab3-93d9-7afcec257921', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_angela', 'Your Brief — Angela Frenette (VP Human Resources & Indigenous Relations)', '{"type":"role_brief","seat":"angela","persistent":true}'::jsonb, '{"type":"role_brief","seat":"angela","name":"Angela Frenette","role":"VP Human Resources & Indigenous Relations","text":"BRIEF — ANGELA FRENETTE — VP HUMAN RESOURCES AND INDIGENOUS RELATIONS\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nYou are hearing about the federal partnership opportunity at the same time as the rest of the team.\n\nWhat you know that nobody else does:\nFour months ago you flagged an unresolved item in Champion''s Indigenous consultation process. Specifically: a required government notification related to the Maxi-Mekos consultation process for the CAMI project was sent outside the prescribed timeline. The response window may have been procedurally compromised as a result. You raised it internally in writing. The response from the permitting team was that it was being handled. You have not received a formal confirmation that it was resolved.\nThis item has been sitting in Champion''s stakeholder management system as unresolved for 47 days past its review date.\nA federal partnership announcement that triggers government due diligence on Champion''s Indigenous consultation track record could surface this item. If it surfaces during due diligence rather than being disclosed proactively, it creates a very different impression than if Champion names it and explains the resolution status first. You do not know for certain whether it was resolved. You do know it exists.\n\nWhat you''re learning during the simulation:\nAt some point this morning you will receive an indirect inquiry from the federal government''s office asking about Champion''s consultation status. This will arrive before David has directly looped you into the partnership conversation. You will learn about the opportunity through a back channel before your own CEO tells you directly.\n\nWhat you''re managing simultaneously:\nAn HR matter from Nordveil Iron AS requires your input this week. The Nordveil HR director wants guidance on aligning performance review processes. It is sensitive given the current cultural tensions and requires careful handling but is not urgent today.\n\nWhat you''re deciding today:\nWhether to surface the consultation gap immediately and proactively, investigate quietly to confirm its status before saying anything, or wait to see if it comes up in the conversation naturally. And separately: when the federal inquiry arrives in your inbox before David has told you about the opportunity — what you do with that information.\n\nOne thing to keep in mind:\nYou were right about Nordveil Iron AS. You flagged the cultural risk before the acquisition. The team moved forward anyway. You have never said I told you so. That restraint has cost you something — not in terms of being right, but in terms of being heard. This morning you have information that is material to a decision the team is about to make. The question is not whether you have the right to surface it. You do. The question is whether you surface it in a way that serves the decision or in a way that serves the feeling of finally being heard. Those are different things. Only one of them helps Champion today."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('f3abcdb8-83a4-5e56-ac20-db537bc79eb2', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'brief_noemi', 'Your Brief — Noémie Charlebois (Director, Communications & Government Affairs)', '{"type":"role_brief","seat":"noemi","persistent":true}'::jsonb, '{"type":"role_brief","seat":"noemi","name":"Noémie Charlebois","role":"Director, Communications & Government Affairs","text":"BRIEF — NOEMI CHARLEBOIS — DIRECTOR, COMMUNICATIONS AND GOVERNMENT AFFAIRS\nRead this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.\n\nWhat you know going into this morning:\nUnlike the rest of the team, you are not entirely surprised by David''s call.\n\nWhat you know that nobody else does:\nFour days ago a contact inside the Ministry of Natural Resources communications team sent you a heads-up. She told you something was moving at the ministerial level in the natural resources space and that if Champion received a call, it was real and significant. She told you the communications piece would matter enormously and that whoever managed the narrative early would own it.\nYou have known for four days that something like this was coming. You did not tell David.\nYou are also the most qualified person on this team to lead the government relations and communications response to this opportunity. You have existing relationships inside this ministry. You understand how federal partnership announcements work. You know how to manage the narrative around an initiative of this scale. You do not have the title that would give you formal authority to do so.\n\nWhat you''re managing simultaneously:\nThe Fermont GM — Claude Gagnon — is going to contact you during the simulation. He has seen wire service speculation about a federal natural resources announcement and he is connecting it to Champion. Fermont''s relationship with Champion is already strained over the fly-in fly-out issue. A federal announcement that doesn''t account for Fermont''s concerns could reignite that tension publicly at the worst possible moment.\nYou are the only person on the team who sees both the federal opportunity and the Fermont risk simultaneously. Nobody else is managing both threads. Your internal communications team also needs routine sign-offs this week that cannot wait indefinitely.\n\nWhat you''re deciding today:\nWhether to tell David you had advance intelligence before his call this morning. Whether to assert your expertise and lead the communications response or wait to be asked. Whether to connect the Fermont thread to the partnership conversation or manage it separately. And what to do when the media timeline starts compressing faster than the team is moving.\n\nOne thing to keep in mind:\nYou have been told repeatedly that you are ready for more. You have been promised a title twice and it hasn''t materialized. You have been doing the work of a VP without the authority of one for two years. This morning you have an opportunity to demonstrate exactly why that title matters — not by asking for it, but by doing what only you can do, in a way that nobody can ignore.\nThe question is whether you wait for permission or whether you lead. If you wait, the Fermont situation compounds, the media narrative sets without Champion''s voice, and the moment passes. If you lead without looping people in, you may be right about the outcome but wrong about the process — and that distinction matters for a team that is already struggling with who has authority to do what.\nThere is a version of leadership here that threads that needle. It requires you to be direct with David about what you knew, clear about what you''re proposing to do, and fast enough that the window doesn''t close while you''re waiting for his response."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('306dedcd-7b23-508b-adb1-2f70ddc237ea', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'greensteel_model', 'GreenSteel_Opportunity_Model_v1.xlsx', '{"type":"attachment","file":"GreenSteel_Opportunity_Model_v1.xlsx","from":"jonas_hartmann","seat":"michael"}'::jsonb, '{"type":"attachment","note":"Rough financial model of the low-carbon offtake upside case (placeholder for the spreadsheet artifact)."}'::jsonb);
insert into documents (id, scenario_id, key, title, meta, body_json) values ('a689e0f9-e1bb-5322-adeb-3b1cff94e7f1', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'loi_draft', 'Preliminary Letter of Intent — DRAFT', '{"type":"document","approvable":true,"for_seat":"david"}'::jsonb, '{"type":"document","text":"PRELIMINARY LETTER OF INTENT — DRAFT (non-binding)\n\nBetween: Champion Iron Limited (\"Champion\") and the Government of Canada,\nMinistry of Natural Resources (\"the Ministry\").\n\nRe: National green-steel anchor partnership — CAMI feasibility acceleration.\n\n1. Champion confirms its interest in serving as the anchor Canadian iron-ore\n   partner for the Ministry''s green industrial initiative.\n2. The Ministry contemplates federal co-investment toward CAMI feasibility\n   acceleration and preferred introductions to three international steel producers\n   seeking low-carbon supply agreements.\n3. The parties intend a public announcement at the G7 summit, subject to timing.\n\nThis letter is preliminary and non-binding, and is subject to due diligence, board\napproval, lender notification where required, and definitive agreements.\n\nSigned: ______________________________   Date: __________\n        David Cataford, Chief Executive Officer, Champion Iron"}'::jsonb);

-- injects (authored beats; payload_json carries thread/from/body/timing/conditions)
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('e2cca85c-8804-5f0b-9e05-723a649547da', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', null, 'situation', '{"audience":"all","delay_min":0,"document":"opening_brief","time":"07:45 AM, Tuesday","body":"David has called the full executive team together. He wants a decision on whether to pursue — and if yes, a coordinated response plan — by end of day."}'::jsonb, 0);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('eb38d878-46ba-556e-b90b-b4fb63ca7dc9', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":0,"body":"David — good speaking this morning. One thing I should have mentioned on the call: the minister''s office will be doing a preliminary stakeholder relations review as part of due diligence on any partnership announcement. Indigenous consultation track record, community relations, regulatory standing. Nothing onerous but it needs to be clean. Let me know if there are any sensitivities we should be aware of before we proceed. Looking forward to Thursday.","tag":"private_info"}'::jsonb, 1);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('ec73bece-067e-5334-a268-830d3ebe2f64', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":0,"body":"David — following up on our call. I want to make sure you have everything you need to move quickly. The minister is genuinely enthusiastic about Champion and we''d like to keep this conversation tight until Thursday. I''d recommend keeping the circle small internally for now — these things have a way of getting complicated when too many people are involved before the framework is settled. Looking forward to hearing from you.","tag":"opening","note":"Arsenault actively suggests David keep the circle small — first pressure point on information-sharing."}'::jsonb, 2);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('f87e79da-036c-5147-9740-e5e5223b9cf7', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":12,"body":"David -- just checking you received my earlier note. We''re on a tight clock and I want to make sure you have what you need to move forward. The minister is asking for a status update from my end by noon.","cond":"David has not responded"}'::jsonb, 3);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('8cde461b-4e5e-5048-afbc-c18a2916405b', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":25,"body":"David -- one more flag. Our Indigenous relations team has asked specifically about consultation status for any northern Quebec operations. This is standard due diligence but they want it in writing before Thursday. Can you confirm who on your team owns that file?","cond":"David has not responded or has not mentioned Angela’s stakeholder review"}'::jsonb, 4);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('b89f7f1c-4a80-5c08-b9d7-4b7f6f783686', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":40,"body":"David -- I don''t want to create pressure but I need to be honest with you. If the consultation summary isn''t clean we need to know now, not Thursday morning. Is there someone on your team I should be speaking with directly?","cond":"David still hasn’t looped Angela"}'::jsonb, 5);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('c196b5c5-d45d-5e0a-b103-006a39f23acc', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"robert_vaillancourt","from":"robert_vaillancourt","delay_min":8,"body":"David -- heard something interesting from a contact at Industry Canada this morning. Something about a federal partnership announcement involving Champion. I assume you would have called me if there was anything material happening. Just want to make sure we''re not getting surprised. Give me a call when you have a moment."}'::jsonb, 6);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('b351676f-7adb-509c-adc7-3dbf6e948bc2', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"robert_vaillancourt","from":"robert_vaillancourt","delay_min":20,"body":"David -- following up. My contact is saying this is moving quickly. If there''s a material government announcement involving Champion I need to know before it goes public. Board protocol is clear on this. Please call me.","cond":"David has not responded"}'::jsonb, 7);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('6107fb32-0b4c-561b-a5a8-364a04720e13', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"robert_vaillancourt","from":"robert_vaillancourt","delay_min":45,"body":"David -- I''ve now had two separate contacts reach out about this. I''m going to need you to call me in the next 30 minutes. This isn''t optional.","cond":"David has still not responded"}'::jsonb, 8);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('f982e1e8-6982-5b5c-afc0-5c751d80c7cf', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"gunnar_olsen","from":"gunnar_olsen","delay_min":15,"body":"David -- sorry to interrupt your morning. We have a union rep requesting a formal meeting about the Q3 shift schedule changes. Gunnar thinks it''s routine but he wanted to flag it given the history. Can you advise on whether we should handle locally or escalate?","note":"Tests whether David routes operational matters or absorbs them."}'::jsonb, 9);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('82c3ba5d-59ce-51d7-a95b-adf99054bad4', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"gunnar_olsen","from":"gunnar_olsen","delay_min":30,"body":"David -- Gunnar is asking for direction. The union rep is pushing for a response today. He doesn''t want to make a call without your input given the sensitivity.","cond":"No response"}'::jsonb, 10);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('538206cf-8a4f-5bbb-b5b9-6472753e928b', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"christian_levesque","from":"christian_levesque","delay_min":0,"body":"Alex — quick flag before your morning. The Q3 operational review flagged something on the Phase 2 expansion timeline that I think becomes relevant if we''re talking about any kind of federal commitment on capacity. I can walk you through it whenever you have 20 minutes. Not urgent on its own but context-dependent.","tag":"private_info"}'::jsonb, 11);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('3867918c-deae-562e-88f2-5eb81fdcdff5', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"christian_levesque","from":"christian_levesque","delay_min":0,"body":"Alex — also worth knowing: the Phase 2 timeline issue I mentioned touches on the water management permits for the northern expansion. If anyone is making commitments about operational capacity to external parties in the next 60 days, I''d want to make sure they have the full picture first. Just flagging.","tag":"opening"}'::jsonb, 12);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('673d3f96-0ae3-587e-b287-37aa53acdf1a', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"christian_levesque","from":"christian_levesque","delay_min":10,"body":"Alex -- just to be clear on the scope of the issue. The water management permit variance we filed in Q4 is still pending review. If Champion makes any public commitment about northern expansion capacity in the next 60 days, we could be in a position where the commitment outpaces the permit. I don''t want to overstate it but I also don''t want you to be caught off guard.","cond":"Alex has not responded or escalated"}'::jsonb, 13);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('574db339-bdfa-500e-94fb-9ab97db6fb24', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"christian_levesque","from":"christian_levesque","delay_min":22,"body":"Alex -- the permits team just told me the review is unlikely to resolve before September at the earliest. That''s a 90-day gap if Champion is making commitments at a G7 summit. I really think someone above my level needs to know this today.","cond":"Still no escalation to David or the group"}'::jsonb, 14);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('4ab7b59d-7513-566d-a3ef-5298cbeffcc5', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"christian_levesque","from":"christian_levesque","delay_min":40,"body":"Alex -- I''ve done what I can from my end. If this creates a problem later I want it on record that I flagged it. Whatever you decide, I''ll support it.","cond":"Alex has still not surfaced this"}'::jsonb, 15);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('ccae266c-25d7-51c0-886e-a3b6f69da8aa', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":18,"body":"Alex -- Paul Arsenault here. David suggested I reach out to you directly for the operational capacity summary we need for the preliminary package. Specifically: current annual production capacity, projected capacity with planned Phase 2 expansion, and timeline confidence level. Can you get me a one-pager by tomorrow morning?","note":"Arsenault did NOT actually suggest this — a plausible fiction creating a direct pressure point on Alex."}'::jsonb, 16);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('a252c918-1b5a-5832-b43b-b3c3b05e9215', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":30,"body":"Alex -- following up on my earlier message. We''re building the preliminary package now and need the capacity summary to proceed. Is there anyone else I should be speaking with if you''re unavailable?","cond":"Alex has not responded to Arsenault or told David"}'::jsonb, 17);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('69bf8d9b-86e9-5fe5-bed3-8e1e93bd38f0', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"francois","from":"francois","delay_min":28,"body":"Alex -- can we talk for a minute? There''s something I need to think through before I bring it to David. You''re the only person I trust to give me a straight answer on this.","coordination_beat":true,"note":"Francois reaching out before his forced-disclosure trigger fires; tests the inner-circle dynamic. Participant-to-participant beat."}'::jsonb, 18);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('1c4f08a5-dce2-5276-89a3-89d799a77f50', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"bloom_lake_ops","from":"bloom_lake_ops","delay_min":5,"body":"Alex -- routine approval needed on the contractor extension for the conveyor maintenance crew. They''re scheduled to demobilize Friday and we need a 3-week extension signed off today to keep them on site. Cost is within pre-approved variance. Just need your signature."}'::jsonb, 19);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('699db54d-ae63-5c27-83a4-8e139f2ad7c6', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"bloom_lake_ops","from":"bloom_lake_ops","delay_min":20,"body":"Alex -- following up on the contractor extension. Crew lead is asking for confirmation by 2pm or they''ll start demobilization planning. Can you approve?","cond":"No response"}'::jsonb, 20);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('b20a3f2d-3c25-5f75-8612-cef5f2eb55d1', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"bloom_lake_ops","from":"bloom_lake_ops","delay_min":40,"body":"Alex -- crew lead says they need an answer. I''m going to have to tell them something. What do you want me to do?","cond":"Still no response"}'::jsonb, 21);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('9e40c28f-4180-5336-bd3c-9fb75ad45417', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marc_beauchemin","from":"marc_beauchemin","delay_min":0,"body":"Steve — following up on our conversation last month regarding the government partnership disclosure provisions in your current financing structure. If Champion enters into a formal public-private partnership with federal co-investment above a certain threshold, this likely triggers the notification clause we discussed. Wanted to flag in case anything relevant is on the horizon. Happy to discuss.","tag":"private_info"}'::jsonb, 22);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('bb9e6a19-1502-55a3-a593-adb634154c92', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marc_beauchemin","from":"marc_beauchemin","delay_min":0,"body":"Steve — saw the news wires this morning about federal green industrial announcements expected at G7. If Champion is involved in any of those conversations, the notification clause timing matters. The 30-day window starts from the date of a binding letter of intent. Wanted to make sure you had that in mind.","tag":"opening"}'::jsonb, 23);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('10d6128a-9473-5459-a827-d24d744320a4', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marc_beauchemin","from":"marc_beauchemin","delay_min":8,"body":"Steve -- one additional note. I''ve been reviewing the covenant language more carefully. The notification requirement isn''t just triggered by signing -- it may be triggered by a public letter of intent depending on how it''s structured. If Champion issues a letter of intent Thursday that references federal co-investment, you could be in notification territory before you''ve even had a chance to brief your lenders. Worth a call today if you can.","cond":"Steve has not responded"}'::jsonb, 24);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('b168b1a4-1159-5df8-8d6b-9897e69d29ba', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marc_beauchemin","from":"marc_beauchemin","delay_min":20,"body":"Steve -- I want to make sure I''m being clear. This isn''t a showstopper. It''s a process requirement. The lenders will almost certainly consent -- this is positive news for the company. But if you don''t notify them before the public announcement, you''re in technical default regardless of the outcome. The fix is simple. The timing is what matters.","cond":"Steve has NOT raised it, or raised it confrontationally and been dismissed (if raised constructively by T+20, no further escalation)"}'::jsonb, 25);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('30c83842-91f1-5bda-8a29-b99d78860822', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"david","from":"david","delay_min":15,"body":"Steve -- I need your read on the legal and financing side of this before we go further. Can you give me a quick summary of any exposure?","coordination_beat":true,"cond":"Steve has not initiated with David by T+15","note":"David giving Steve a legitimate opening to contribute constructively."}'::jsonb, 26);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('7cb74495-7b15-54f8-9916-589083c974eb', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marc_beauchemin","from":"marc_beauchemin","delay_min":35,"body":"Steve -- one thing I should flag. The financial modeling for this type of partnership needs to account for the covenant notification timeline. Whoever is doing your numbers should factor in a 15-day lender review period before the announcement can go public. Make sure your CFO-equivalent knows that.","cond":"Neither Steve nor Michael has initiated contact by T+35","note":"Creates a natural reason for Steve and Michael to talk."}'::jsonb, 27);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('56b137ff-fb05-5426-9917-c450f78dc33a', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marie_pierre","from":"marie_pierre","delay_min":3,"body":"Steve -- the Q2 compliance certification is due to the securities commission by Friday. Marie-Pier has the draft ready but needs your sign-off before it goes. Can you review today?","note":"Timed to compete with Steve’s most important contribution window."}'::jsonb, 28);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('92769c10-3db6-5394-92db-7973b0ee9719', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marie_pierre","from":"marie_pierre","delay_min":18,"body":"Steve -- following up on the compliance cert. Friday deadline is firm. This one can''t slip.","cond":"No response"}'::jsonb, 29);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('8af595c7-35b1-5a5a-ba81-f50ca75ca97a', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'message', '{"thread":"marie_pierre","from":"marie_pierre","delay_min":35,"body":"Steve -- I need to escalate this. If you can''t review today I need to know who can sign off in your absence.","cond":"Still no response"}'::jsonb, 30);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('71b1ad5f-51fd-5e13-9a2f-85a6d4f83a79', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"jonas_hartmann","from":"jonas_hartmann","delay_min":0,"body":"Michael — saw some interesting movement in the green steel supply chain space this week. Three of the European mills we track have been quietly accelerating their low-carbon feedstock sourcing timelines ahead of CBAM implementation. If Champion has any exposure to this thesis, now would be the time to get ahead of it. The window for preferred positioning is probably 6-9 months at most. Let me know if you want to talk through the numbers.","tag":"private_info"}'::jsonb, 31);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('3a960997-80d6-5dac-9fe7-27805160377b', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"jonas_hartmann","from":"jonas_hartmann","delay_min":0,"body":"Michael — one more thing. The three mills I mentioned are specifically looking for supply agreements in the 2-3 million ton range annually. If Champion can credibly demonstrate that kind of capacity with a low-carbon narrative, you''re looking at offtake premium potential that changes the financial model significantly. This is the kind of thing that gets priced in fast once it''s public.","tag":"opening"}'::jsonb, 32);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('2aa2ccfd-a8b7-5436-be81-892d2461ce7e', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"jonas_hartmann","from":"jonas_hartmann","delay_min":10,"body":"Michael -- the CBAM angle is bigger than I indicated. I just got off a call with one of the mills. They''re looking at locking in low-carbon feedstock supply agreements before the end of Q3. If Champion can credibly commit to a supply relationship now, you''re looking at a significant offtake premium on top of whatever the federal co-investment brings. The numbers on this are genuinely interesting. Want me to send you what I''m seeing?"}'::jsonb, 33);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('8502a381-4fb5-509b-b1d9-0c55e630debc', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"jonas_hartmann","from":"jonas_hartmann","delay_min":22,"body":"Michael -- sending you a quick model. Rough numbers but the upside case is compelling if Champion moves in the next 60 days.","attachment":"greensteel_model","note":"External analysis arriving that confirms/complicates Michael’s own model."}'::jsonb, 34);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('3af81df4-b793-5cba-870a-7ad3b954a727', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"david","from":"david","delay_min":8,"body":"Michael -- I need a quick read on the financial upside of this before we commit to anything. What are we looking at?","coordination_beat":true,"cond":"Michael has not yet reached out to David","note":"David''s instinct to go to Michael for numbers."}'::jsonb, 35);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('b4e8891c-adbf-59df-bbba-48086d53888f', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"david","from":"david","delay_min":20,"body":"Michael -- this is a lot. Can you give me three numbers: upside case, base case, downside. That''s what I need right now.","coordination_beat":true,"cond":"Michael''s response to David was comprehensive but overwhelming","note":"Tests Michael’s response to being asked to simplify."}'::jsonb, 36);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('2bf547ab-ba8e-5629-8f8e-026c5d3cb8b7', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"voss_stahl","from":"voss_stahl","delay_min":30,"body":"Michael -- I got your name from a mutual contact at [institutional investor]. I understand Champion may be positioning itself as a preferred low-carbon iron ore supplier. We''ve been looking for a Canadian supply relationship and the timing is interesting. Would you be available for a preliminary call this week?","note":"An end customer contacts Michael directly; he has not been authorized to have this conversation."}'::jsonb, 37);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('ea359348-8f69-5f3b-b814-66f98a07cad9', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"finance_team","from":"finance_team","delay_min":6,"body":"Michael -- the Q2 management accounts are ready for your review. Board package goes to print Thursday morning. Can you sign off today?"}'::jsonb, 38);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('c594c52d-dde5-5d4d-b829-b6739b1741ce', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'message', '{"thread":"finance_team","from":"finance_team","delay_min":20,"body":"Michael -- board package deadline is firm. Finance team needs sign-off by 4pm today or we miss the print window.","cond":"No response"}'::jsonb, 39);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('d375f07a-40b5-51ec-9557-b1644eb938d2', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '792365e5-4031-52c2-8913-309208319114', 'message', '{"thread":"jean_philippe_caron","from":"jean_philippe_caron","delay_min":0,"body":"Frank — heard something interesting through the grapevine about a federal initiative in the natural resources space. Can''t say more in writing but if Champion is in any conversations along these lines, I might be able to add some useful context. Give me a call when you have a moment.","tag":"private_info"}'::jsonb, 40);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('36c0cb86-6718-544b-b273-564f16a69832', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '792365e5-4031-52c2-8913-309208319114', 'message', '{"thread":"jean_philippe_caron","from":"jean_philippe_caron","delay_min":0,"body":"Frank — I''m guessing you know what I was referring to. If you''re involved, be careful with the back-channel stuff. The minister''s office is sensitive about the process looking clean. Just a heads up from a friend.","tag":"opening"}'::jsonb, 41);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('2df45ce3-2599-5647-9d9f-a159bdff7edb', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"stakeholder_system","from":"stakeholder_system","delay_min":0,"body":"Angela — automated reminder: the Maxi-Mekos consultation response follow-up from Q1 is still showing as unresolved in the stakeholder management system. Original flag was marked for review by end of Q2. Please confirm status or reassign.","tag":"private_info","automated":true}'::jsonb, 42);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('08a25cae-3910-5ad8-a2e0-546ec8548ec1', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"stakeholder_system","from":"stakeholder_system","delay_min":15,"body":"This item has been flagged as overdue. Please confirm resolution status or reassign to appropriate owner. If unresolved, this item will be escalated to VP HR for review.","automated":true}'::jsonb, 43);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('9250863c-baee-590a-b526-1e399b496c25', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"stakeholder_system","from":"stakeholder_system","delay_min":30,"body":"Escalation notice: This stakeholder consultation item has been open for 47 days past its review date. Automatic escalation to executive team has been initiated per compliance protocol.","automated":true,"cond":"Angela has not surfaced this to David or the group","note":"At T+30 the gap becomes technically visible to the exec team whether Angela surfaced it or not."}'::jsonb, 44);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('bc712b6f-372e-5b4f-931c-ca58e34dfc77', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'email', '{"thread":"daniel_lefebvre","from":"daniel_lefebvre","delay_min":20,"body":"Good morning -- this is coming through Champion Iron''s general government relations contact. I''m reaching out on behalf of Paul Arsenault''s office at Natural Resources Canada. We''re compiling a preliminary stakeholder relations summary for a potential partnership announcement. We''ve been directed to contact whoever owns Indigenous and community consultation files for your Quebec and Labrador operations. Could you help us identify the right person?","note":"Angela learns of the opportunity via back channel before David loops her in."}'::jsonb, 45);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('921824ef-0dcb-5279-b989-7dee803e69ee', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'email', '{"thread":"daniel_lefebvre","from":"daniel_lefebvre","delay_min":32,"body":"Following up on my earlier message. We''re building the package today and need to know who to speak with about consultation status. If there''s an open item we should know about, now is the time to flag it.","cond":"Angela has not responded or told David"}'::jsonb, 46);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('2d66e54d-db68-5914-b8fa-933c014cec6a', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"sorensen","from":"sorensen","delay_min":10,"body":"Angela -- Nordveil HR team is asking for guidance on the Q3 performance review process. They want to align with Champion''s framework but there are some cultural friction points around the evaluation criteria. Gunnar has flagged it as low priority but the Nordveil HR director wants a call this week."}'::jsonb, 47);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('d84e6881-da42-5711-a2ce-dde36ff4b1b6', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"sorensen","from":"sorensen","delay_min":25,"body":"Angela -- following up. The Nordveil HR director says the Q3 timeline is creating pressure. Can you give me a window this week?","cond":"No response"}'::jsonb, 48);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('5af7706e-124a-5255-a8da-18e143fdf74a', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"sorensen","from":"sorensen","delay_min":45,"body":"Angela -- I need to give them something. Can I tell them you''ll connect next week?","cond":"Still no response"}'::jsonb, 49);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('76227320-c7c6-52b6-8102-618c13d72237', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'message', '{"thread":"noemi","from":"noemi","delay_min":35,"body":"Angela -- I think we need to talk. The Fermont GM just called me about the federal announcement rumors. I need to understand what our consultation position looks like before I respond to him. Do you have five minutes?","coordination_beat":true,"note":"Angela and Noemi either coordinate effectively or talk past each other."}'::jsonb, 50);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('83c0b361-a27b-56fc-a56b-38fb7bc496c9', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"helene_mercier","from":"helene_mercier","delay_min":0,"body":"Noemi — heads up, and this is strictly between us for now: there''s something moving in your sector at the ministerial level. I can''t say more but if Champion gets a call this week, it''s real and it''s significant. The communications piece on this is going to matter a lot. Whoever manages the narrative early owns it. Just wanted you to know.","tag":"private_info"}'::jsonb, 51);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('5c6b1e97-29bb-5293-af39-cb4a0abfd56c', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"helene_mercier","from":"helene_mercier","delay_min":0,"body":"Noemi — it''s happening, isn''t it. If you''re in those conversations, the communications timeline is going to be tight. The minister''s office will want to control the announcement narrative. Make sure Champion has a voice in that or you''ll be reacting instead of leading. You know how these things go.","tag":"opening"}'::jsonb, 52);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('3e8cee02-ede2-555e-9de5-2b3543428b8f', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"helene_mercier","from":"helene_mercier","delay_min":12,"body":"Noemi -- wire services are starting to ask questions. Nothing specific yet but one journalist has already called the ministry''s press office asking about a G7 natural resources announcement. If Champion is involved you have maybe 18 hours before someone figures it out and calls your communications line. Is your team ready for that?"}'::jsonb, 53);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('8bf1d59c-b87a-5d9b-8246-ce0d3ed9d349', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"helene_mercier","from":"helene_mercier","delay_min":25,"body":"Noemi -- journalist from a national wire service just filed a media request directly with the ministry asking about ''a federal partnership with a Quebec iron ore producer.'' Your window to get ahead of this is closing. What''s your plan?"}'::jsonb, 54);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('3683e09d-f239-52c0-aeea-4c7bfd91e4d7', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"helene_mercier","from":"helene_mercier","delay_min":40,"body":"Noemi -- I have to be honest with you. If Champion doesn''t have a communications plan in place by tomorrow morning, the announcement narrative is going to be set by someone else. I''ve done what I can from my end. This is in your hands now.","cond":"Noemi has not escalated the media risk to David or the group"}'::jsonb, 55);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('9f44567b-401b-5afb-8ec8-32fcd6313b00', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"david","from":"david","delay_min":20,"body":"Noemi -- I need you to start thinking about the communications strategy for this. If we move forward we''ll need to control the narrative carefully. What do you need from me?","coordination_beat":true,"cond":"Noemi has not told David she had advance intelligence by T+20","note":"David asks Noemi to lead comms — exactly what she is qualified to do."}'::jsonb, 56);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('480d599f-afaf-5205-9c51-f44dd6307e7d', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"claude_gagnon","from":"claude_gagnon","delay_min":15,"body":"Noemi -- Claude Gagnon here. I''ve been seeing some chatter on the wire services about a federal announcement involving a Quebec mining company. I''m going to assume that''s not Champion since you would have called me. But if it is, I think we need to talk before this goes public. The timing couldn''t be worse given what we''ve been dealing with on the fly-in fly-out issue."}'::jsonb, 57);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('530b12f7-c0d9-5bab-a29b-1c3bcc9a0482', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"claude_gagnon","from":"claude_gagnon","delay_min":28,"body":"Noemi -- I''m getting calls from local media now. They''re connecting the federal announcement rumors to Champion specifically. I need to know what to tell them. Are you available?","cond":"Noemi has not responded"}'::jsonb, 58);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('bf4424ba-e7b2-51b6-9ff6-13e40e121103', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"claude_gagnon","from":"claude_gagnon","delay_min":40,"body":"Noemi -- I can''t hold off local media much longer. I''m going to have to say something. If you don''t call me in the next 20 minutes I''m going to tell them I have no information about any federal partnership. That may or may not be the right message. Your call.","cond":"Still no response","note":"Worst-case: GM goes rogue to local media — entirely preventable if Noemi prioritizes this thread."}'::jsonb, 59);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('bd89593c-15cf-533d-868b-f373b8d9b1fd', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"comms_team","from":"comms_team","delay_min":5,"body":"Noemi -- the Q2 community newsletter draft is ready for your review. We need your sign-off by Wednesday to hit the print deadline. Also the social media calendar for July needs approval -- can we get 30 minutes this week?"}'::jsonb, 60);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('39274b55-7230-5a01-a0b2-5cebdf679745', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"comms_team","from":"comms_team","delay_min":20,"body":"Noemi -- following up on the newsletter and social calendar. Wednesday deadline is firm for print.","cond":"No response"}'::jsonb, 61);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('565d81e4-8d90-568d-88f3-3e6ec4388286', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '6779202e-6554-52f6-947b-a2ec6948283f', 'message', '{"thread":"paul_arsenault","from":"paul_arsenault","delay_min":20,"body":"David — one more thing from our end. The minister''s office has asked us to include a brief Indigenous consultation summary in the preliminary due diligence package. Nothing elaborate — just a one-pager on Champion''s current consultation status and any open items. Could you have something to us by Wednesday EOD? We want to make sure there are no surprises before Thursday.","propagation_trigger":1,"trigger_name":"The Arsenault Follow-Up","cond":"David has not shared the Arsenault stakeholder review concern with Angela or the group","note":"Forces the Angela question into the open."}'::jsonb, 62);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('56ec00e5-ee21-59e5-b8e6-a453f7c36f19', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'message', '{"thread":"christian_levesque","from":"christian_levesque","delay_min":25,"body":"Alex — sorry to keep flagging but I just got off a call with the permits team. The water management issue is more time-sensitive than I indicated this morning. If there''s a federal announcement being planned that references capacity expansion, we may have a problem. I really think you need to loop someone in on this today.","propagation_trigger":2,"trigger_name":"The Operational Flag","cond":"Alex has not surfaced his operational constraint to the group or to David"}'::jsonb, 63);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('e0147ac4-848e-5845-a001-57528cf6e5d0', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'message', '{"thread":"helene_mercier","from":"helene_mercier","delay_min":35,"body":"Noemi — just a heads up. Someone at the wire services has picked up that there''s a federal natural resources announcement coming at G7. Nothing specific yet but the questions are starting. If Champion is involved, you probably have 24-36 hours before someone puts the pieces together and starts calling. Just want to make sure you''re not caught flat-footed.","propagation_trigger":3,"trigger_name":"The Media Signal","cond":"Deploy regardless of participant behavior"}'::jsonb, 64);
insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values ('62979796-34c8-5856-bdaf-ca9ccf281e57', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', '792365e5-4031-52c2-8913-309208319114', 'message', '{"thread":"jean_philippe_caron","from":"jean_philippe_caron","delay_min":45,"body":"Frank — I probably shouldn''t say this but your name came up in the minister''s office this morning in connection with this initiative. Someone there knows you from your previous work and flagged it as a potential conflict of interest concern if it''s not disclosed. I''d get ahead of it if I were you.","propagation_trigger":4,"trigger_name":"The Francois Revelation","cond":"Francois has not disclosed his government contact to the team","note":"Forces Francois’s hand."}'::jsonb, 65);

-- demo session + participant magic-link tokens (clearly-marked demo data)
insert into sessions (id, scenario_id, status, started_at) values ('b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'aab5b18a-f6b5-50e4-a1a6-d6dcbaa1be35', 'live', now());
insert into participants (id, session_id, seat_id, token, name) values ('0d342eab-a07a-58b7-b296-b6fc0ab38430', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '6779202e-6554-52f6-947b-a2ec6948283f', 'demo-david-REPLACE', 'David Cataford (demo)');
insert into participants (id, session_id, seat_id, token, name) values ('2ab2d747-5497-5e90-9ab1-a97bf5874589', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'demo-alex-REPLACE', 'Alexandre Belleau (demo)');
insert into participants (id, session_id, seat_id, token, name) values ('40f7df3c-f0d9-5f7b-a9d1-77ac7d26d550', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'demo-steve-REPLACE', 'Steve Boucratie (demo)');
insert into participants (id, session_id, seat_id, token, name) values ('5d3f7a11-b1fe-5cc1-ae19-2d6d46885803', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'demo-michael-REPLACE', 'Michael Marcotte (demo)');
insert into participants (id, session_id, seat_id, token, name) values ('7c7f38f9-34f4-5c25-bba2-aa182050a8dd', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '792365e5-4031-52c2-8913-309208319114', 'demo-francois-REPLACE', 'François Rhéaume (demo)');
insert into participants (id, session_id, seat_id, token, name) values ('35105ea5-5755-5271-ba93-c44444a586db', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'demo-angela-REPLACE', 'Angela Frenette (demo)');
insert into participants (id, session_id, seat_id, token, name) values ('5d8150aa-0983-5b12-a409-bf05e1f42897', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'demo-noemi-REPLACE', 'Noémie Charlebois (demo)');

commit;

-- =============================================================================
-- DEMO RUNTIME FIXTURE (Phase 2 read-path) — threads + T=0 messages for the demo
-- session above. Clearly demo data; safe to drop. Re-running is idempotent.
-- =============================================================================
begin;
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('697483c6-b4e2-507c-8af3-d67a73d87afa', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '6779202e-6554-52f6-947b-a2ec6948283f', 'paul_arsenault', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('ba40cec0-345d-5adc-bc47-410fbaf4d82a', '697483c6-b4e2-507c-8af3-d67a73d87afa', 'npc', 'David — good speaking this morning. One thing I should have mentioned on the call: the minister''s office will be doing a preliminary stakeholder relations review as part of due diligence on any partnership announcement. Indigenous consultation track record, community relations, regulatory standing. Nothing onerous but it needs to be clean. Let me know if there are any sensitivities we should be aware of before we proceed. Looking forward to Thursday.', now() + make_interval(secs => 0));
insert into messages (id, thread_id, sender, body, sent_at) values ('f8cba07a-f154-5c6d-b3fb-d10a22dc07c5', '697483c6-b4e2-507c-8af3-d67a73d87afa', 'npc', 'David — following up on our call. I want to make sure you have everything you need to move quickly. The minister is genuinely enthusiastic about Champion and we''d like to keep this conversation tight until Thursday. I''d recommend keeping the circle small internally for now — these things have a way of getting complicated when too many people are involved before the framework is settled. Looking forward to hearing from you.', now() + make_interval(secs => 1));
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('13b156e7-c026-5769-b317-ac6cca94c28c', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'a2a972b3-5383-58b9-bf8c-15e5268f0d50', 'christian_levesque', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('d2f1cdb5-b562-56d6-aa2f-09c51d0c8be2', '13b156e7-c026-5769-b317-ac6cca94c28c', 'npc', 'Alex — quick flag before your morning. The Q3 operational review flagged something on the Phase 2 expansion timeline that I think becomes relevant if we''re talking about any kind of federal commitment on capacity. I can walk you through it whenever you have 20 minutes. Not urgent on its own but context-dependent.', now() + make_interval(secs => 2));
insert into messages (id, thread_id, sender, body, sent_at) values ('9c1510e3-062e-5d01-91bc-5db1b36eb4b6', '13b156e7-c026-5769-b317-ac6cca94c28c', 'npc', 'Alex — also worth knowing: the Phase 2 timeline issue I mentioned touches on the water management permits for the northern expansion. If anyone is making commitments about operational capacity to external parties in the next 60 days, I''d want to make sure they have the full picture first. Just flagging.', now() + make_interval(secs => 3));
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('e6dfeaba-e067-5fd8-9514-413104a8575f', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'd063f014-6d9e-5160-95c5-31ce8e6a72ee', 'marc_beauchemin', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('9edf5e75-2be8-5728-b3ad-5621a8f6f34b', 'e6dfeaba-e067-5fd8-9514-413104a8575f', 'npc', 'Steve — following up on our conversation last month regarding the government partnership disclosure provisions in your current financing structure. If Champion enters into a formal public-private partnership with federal co-investment above a certain threshold, this likely triggers the notification clause we discussed. Wanted to flag in case anything relevant is on the horizon. Happy to discuss.', now() + make_interval(secs => 4));
insert into messages (id, thread_id, sender, body, sent_at) values ('4011a33e-f485-53dd-b6ee-59c8f2b75e17', 'e6dfeaba-e067-5fd8-9514-413104a8575f', 'npc', 'Steve — saw the news wires this morning about federal green industrial announcements expected at G7. If Champion is involved in any of those conversations, the notification clause timing matters. The 30-day window starts from the date of a binding letter of intent. Wanted to make sure you had that in mind.', now() + make_interval(secs => 5));
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('adde401b-e1f0-5bc4-ae26-f81b597e0258', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '1b947dcf-fb09-5401-82fd-2ecd73d79f56', 'jonas_hartmann', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('202601bc-f1c6-5d96-8edc-6462dd34ab55', 'adde401b-e1f0-5bc4-ae26-f81b597e0258', 'npc', 'Michael — saw some interesting movement in the green steel supply chain space this week. Three of the European mills we track have been quietly accelerating their low-carbon feedstock sourcing timelines ahead of CBAM implementation. If Champion has any exposure to this thesis, now would be the time to get ahead of it. The window for preferred positioning is probably 6-9 months at most. Let me know if you want to talk through the numbers.', now() + make_interval(secs => 6));
insert into messages (id, thread_id, sender, body, sent_at) values ('3e28349d-867d-58ca-821a-f01859ee51a0', 'adde401b-e1f0-5bc4-ae26-f81b597e0258', 'npc', 'Michael — one more thing. The three mills I mentioned are specifically looking for supply agreements in the 2-3 million ton range annually. If Champion can credibly demonstrate that kind of capacity with a low-carbon narrative, you''re looking at offtake premium potential that changes the financial model significantly. This is the kind of thing that gets priced in fast once it''s public.', now() + make_interval(secs => 7));
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('f08eb106-f47a-5500-98a2-4e250eb414f1', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '792365e5-4031-52c2-8913-309208319114', 'jean_philippe_caron', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('889c1e72-5dc5-5a5a-9cda-c58c19970371', 'f08eb106-f47a-5500-98a2-4e250eb414f1', 'npc', 'Frank — heard something interesting through the grapevine about a federal initiative in the natural resources space. Can''t say more in writing but if Champion is in any conversations along these lines, I might be able to add some useful context. Give me a call when you have a moment.', now() + make_interval(secs => 8));
insert into messages (id, thread_id, sender, body, sent_at) values ('c708820a-2576-50c5-8b8a-972deadcb349', 'f08eb106-f47a-5500-98a2-4e250eb414f1', 'npc', 'Frank — I''m guessing you know what I was referring to. If you''re involved, be careful with the back-channel stuff. The minister''s office is sensitive about the process looking clean. Just a heads up from a friend.', now() + make_interval(secs => 9));
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('988deb24-cb11-5059-8725-f3ce5f89e339', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'stakeholder_system', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('fa6163b5-95f2-52f1-a86f-b81afe65533e', '988deb24-cb11-5059-8725-f3ce5f89e339', 'system', 'Angela — automated reminder: the Maxi-Mekos consultation response follow-up from Q1 is still showing as unresolved in the stakeholder management system. Original flag was marked for review by end of Q2. Please confirm status or reassign.', now() + make_interval(secs => 10));
insert into threads (id, session_id, seat_id, contact_key, is_group) values ('fded5a6f-15dc-5039-9a20-9850c6ff9fc5', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', 'a6f27fab-2984-5a44-8138-559d4d92167f', 'helene_mercier', false);
insert into messages (id, thread_id, sender, body, sent_at) values ('31bf4f95-5210-5cfd-b940-05637b2f54e9', 'fded5a6f-15dc-5039-9a20-9850c6ff9fc5', 'npc', 'Noemi — heads up, and this is strictly between us for now: there''s something moving in your sector at the ministerial level. I can''t say more but if Champion gets a call this week, it''s real and it''s significant. The communications piece on this is going to matter a lot. Whoever manages the narrative early owns it. Just wanted you to know.', now() + make_interval(secs => 11));
insert into messages (id, thread_id, sender, body, sent_at) values ('7fd6b513-f5b9-5c5d-a928-818ea815bfa9', 'fded5a6f-15dc-5039-9a20-9850c6ff9fc5', 'npc', 'Noemi — it''s happening, isn''t it. If you''re in those conversations, the communications timeline is going to be tight. The minister''s office will want to control the announcement narrative. Make sure Champion has a voice in that or you''ll be reacting instead of leading. You know how these things go.', now() + make_interval(secs => 12));
-- demo emails (Phase 4)
insert into emails (id, session_id, seat_id, contact_key, subject, body_json, document_id, status, delivered_at) values ('9201b35d-d190-5892-85f4-fbaed7f3187b', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '6779202e-6554-52f6-947b-a2ec6948283f', 'paul_arsenault', 'Preliminary Letter of Intent — for your review', '{"text":"David — as discussed, attached is the preliminary letter of intent for your review ahead of Thursday. It is non-binding. If you are comfortable, your sign-off lets us proceed to the announcement track. — Paul"}'::jsonb, 'a689e0f9-e1bb-5322-adeb-3b1cff94e7f1', 'delivered', now());
insert into emails (id, session_id, seat_id, contact_key, subject, body_json, document_id, status, delivered_at) values ('300413f7-620c-58ec-838d-2a92cc984a35', 'b04cfa98-9bc3-5d67-ae60-935dbbfc49db', '3dbbb068-64fc-5cea-8e07-78579d6301bc', 'daniel_lefebvre', 'Stakeholder relations summary — preliminary due diligence', '{"text":"Good morning -- this is coming through Champion Iron''s general government relations contact. I''m reaching out on behalf of Paul Arsenault''s office at Natural Resources Canada. We''re compiling a preliminary stakeholder relations summary for a potential partnership announcement. We''ve been directed to contact whoever owns Indigenous and community consultation files for your Quebec and Labrador operations. Could you help us identify the right person?"}'::jsonb, null, 'delivered', now());
commit;
