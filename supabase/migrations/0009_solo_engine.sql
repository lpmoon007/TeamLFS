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
