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
