-- =============================================================================
-- TLFS — the Leadership Profile foundation (Screen-13 handoff, §1 schema-level constraints).
-- The profile is a longitudinal, FALSIFIABLE read of how a person leads across runs. Three
-- rules here are load-bearing and must exist before any profile generates (retrofitting them
-- later is a migration + a rewrite of generation):
--
--   1. falsifier NOT NULL on every claim — a finding that predicts nothing can never be
--      wrong, so it isn't a finding. This one constraint is the whole self-revision spec.
--   2. consents schema, time-boxed (expires_at NOT NULL) — no perpetual consent; the private
--      profile is never exposed to a sponsor role at the data layer.
--   3. claims key on the SUBJECT (the cross-session behavioral-memory identity), not a single
--      run's participant — "across runs" means per person.
--
-- Additive. Accessed only through server actions on the service-role client (RLS on, no
-- public policy). Development Summary / team-wall / sponsor scopes are a later (exec) phase.
-- =============================================================================

-- The claim ledger — every finding is a falsifiable claim, graded each run.
create table if not exists profile_claims (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid not null references subjects (id) on delete cascade,
  text              text not null,                      -- the claim, second person, one sentence
  falsifier         text not null,                      -- the specific observation that would overturn it (§1A — the whole spec)
  marker            text,                               -- which of the six normalised markers (null = cross-marker)
  made_at_run       integer not null,                   -- run number when first written
  status            text not null default 'open'
                      check (status in ('open','held','sharpened','overturned','withdrawn','untested')),
  held_count        integer not null default 0,         -- increments ONLY on a new tested condition
  conditions_tested text[]  not null default '{}',      -- e.g. {forthcoming,guarded} — drives confidence, not held_count
  superseded_by     uuid references profile_claims (id) on delete set null,  -- set when sharpened/overturned
  evidence_refs     uuid[]  not null default '{}',       -- event ids that produced the grade
  graded_at_run     integer,
  created_at        timestamptz not null default now()
);
create index if not exists profile_claims_subject_idx on profile_claims (subject_id);
create index if not exists profile_claims_status_idx  on profile_claims (subject_id, status);

-- The generated profile per run (the rendered readout: fingerprint, findings, trajectory,
-- transfer layer, prescribed rep, next scenario) — kept as a snapshot so history is auditable.
create table if not exists leadership_profiles (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references subjects (id) on delete cascade,
  run_no        integer not null,                       -- completed-run count at generation
  session_id    uuid references sessions (id) on delete set null,  -- the run that triggered generation
  body_json     jsonb not null,                         -- structured profile the UI renders
  model         text,
  input_tokens  integer,
  output_tokens integer,
  generated_at  timestamptz not null default now()
);
create index if not exists leadership_profiles_subject_idx on leadership_profiles (subject_id, run_no);

-- Artifact-release consent — per artifact, per recipient, time-boxed, revocable. (Distinct
-- from the session-capture `consents` table in 0005; this governs releasing a generated
-- artifact to a recipient.) Landed now (cheap), enforced in the exec phase. A private
-- profile is NEVER returned to a sponsor role.
create table if not exists artifact_consents (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid references subjects (id) on delete cascade,
  artifact_id       uuid,
  artifact_type     text,                               -- 'profile' | 'development_summary'
  recipient_role    text,                               -- 'coach' | 'sponsor' | 'manager' | ...
  recipient_name    text,
  scope             text,
  granted_at        timestamptz not null default now(),
  expires_at        timestamptz not null,               -- REQUIRED — no perpetual consent (§3)
  revoked_at        timestamptz,
  disclaimer_version text,
  ip                text,
  text_shown_hash   text                                -- hash of the exact text shown, to prove what was promised
);
create index if not exists artifact_consents_subject_idx on artifact_consents (subject_id);

alter table profile_claims      enable row level security;
alter table leadership_profiles enable row level security;
alter table artifact_consents   enable row level security;

comment on table profile_claims is
  'The claim ledger: every profile finding as a falsifiable claim, graded held/sharpened/'
  'overturned/withdrawn/untested each run. falsifier is NOT NULL by design — a claim that '
  'cannot be overturned is decoration, not a finding.';
comment on column profile_claims.falsifier is 'The specific observation that would overturn this claim. Never null.';
comment on table leadership_profiles is 'Per-run generated Leadership Profile snapshot (private to participant + coach).';
comment on table artifact_consents is 'Time-boxed, revocable artifact-release consent. Private profiles are never exposed to a sponsor role.';
