-- =============================================================================
-- TLFS — Behavioral Panel (Two-Tier Spec). The repeatable "blood-test" panel over
-- the LOCKED event log: two independent axes per person — Tier A executive judgment
-- and Tier B teaming contribution — normalized by scenario difficulty, trended over
-- time, per person and per team.
--
-- Same Layer-1/2 discipline as the spine: `events` stays the locked capture; this is
-- a versioned derived READ (`behavioral_panel`) plus a cohort reference store
-- (`panel_norms`). One authored knob added to scenarios: a difficulty coefficient.
-- Additive; nothing here is required by an existing row.
-- =============================================================================

-- Scenario difficulty coefficient (Spec §8.1) — one authored number per scenario, used
-- to normalize raw marker rates before they hit a reference range. 1.0 = baseline.
alter table scenario_meta add column if not exists difficulty numeric not null default 1.0;

-- One row per person per run — a panel "draw". Raw rates, normalized scores, percentile
-- and confidence per marker (Spec §9: store all three so provisional numbers read
-- honestly before reference ranges mature). Trends are queries over this table.
create table behavioral_panel (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references sessions (id) on delete cascade,
  participant_id   uuid references participants (id) on delete cascade,
  subject_id       uuid references subjects (id) on delete set null,   -- cross-session identity
  scenario_id      uuid references scenarios (id) on delete set null,
  mode             session_mode not null,
  difficulty       numeric not null default 1.0,
  -- markers: { "A1": {raw, normalized, percentile, confidence, exercised}, … B1 … }
  markers          jsonb not null default '{}'::jsonb,
  tier_a           numeric,          -- composite executive judgment (0..100)
  tier_b           numeric,          -- composite teaming contribution (0..100); null in solo
  quadrant         text,             -- multiplier | lone_genius | connector | struggling | na
  provisional      boolean not null default true,   -- true until the cohort ranges mature
  taxonomy_version text not null default 'panel-v0.1',
  scorer_version   text not null default 'panel-v0.1.0',
  created_at       timestamptz not null default now()
);
create index behavioral_panel_subject_idx on behavioral_panel (subject_id, created_at);
create index behavioral_panel_session_idx on behavioral_panel (session_id);

-- Cohort reference ranges — built as runs accumulate. A marker is reported as a
-- percentile against a cohort (role / org / all-runs); bands are provisional until
-- N is sufficient (~30–50). One row per (cohort, marker, version).
create table panel_norms (
  id               uuid primary key default gen_random_uuid(),
  cohort           text not null,          -- 'all' | 'role:<key>' | 'org:<uuid>' | 'scenario:<uuid>'
  marker           text not null,          -- A1..A6 | B1..B6
  taxonomy_version text not null default 'panel-v0.1',
  n                integer not null default 0,
  mean             numeric,
  sd               numeric,
  p10              numeric,
  p50              numeric,
  p90              numeric,
  updated_at       timestamptz not null default now(),
  unique (cohort, marker, taxonomy_version)
);

alter table behavioral_panel enable row level security;
alter table panel_norms      enable row level security;

comment on table behavioral_panel is
  'Behavioral Panel (Two-Tier Spec) — one draw per person per run. Derived Layer-2 read '
  'over the LOCKED events log; markers stored raw+normalized+percentile+confidence.';
comment on table panel_norms is
  'Cohort reference ranges for the panel, accumulated as runs land. Panels read '
  'provisional until N is sufficient (~30-50 per cohort).';
