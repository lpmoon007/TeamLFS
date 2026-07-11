-- =============================================================================
-- The Signal / TLFS — Phase 9: the cross-session Behavioral Memory Spine.
--
-- The spine's whole point is "how a PERSON behaves under load" — across
-- engagements, not just within one session. But `participants` are per-session
-- (one row per seat per session), and `behavioral_profile` keyed on participant_id
-- can therefore only ever hold a single session's trajectory. The missing backbone
-- is a stable PERSON identity that links a person's participant rows across
-- sessions. This migration adds it (`subjects`) and the FK hooks so trajectories
-- accumulate per person — the substrate Director-AI / twin / gossip / season read.
--
-- Additive + nullable: nothing here is required by an existing row. Identity is
-- resolved server-side (lib/spine.ts) from the participant's email/name handle.
-- =============================================================================

-- A person the spine remembers, scoped to an org (the same human across sessions).
-- `handle` is the stable identity key within an org — email when we have it, else a
-- name slug. Resolution is get-or-create by (org_id, handle).
create table subjects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations (id) on delete cascade,
  handle       text not null,               -- email (preferred) or name slug — stable per person
  display_name text,
  created_at   timestamptz not null default now(),
  unique (org_id, handle)
);
comment on table subjects is
  'Phase 9 — the cross-session person identity behind per-session participants. '
  'Get-or-create by (org_id, handle); handle is email when known. behavioral_profile '
  'accumulates per subject, so the spine is longitudinal across engagements.';

-- Link each session occupant to the person behind it (resolved at finalize).
alter table participants add column if not exists subject_id uuid references subjects (id) on delete set null;
create index if not exists participants_subject_idx on participants (subject_id);

-- The longitudinal profile now keys on the PERSON. participant_id stays (which run
-- last wrote it) but subject_id is the cross-session accumulation key.
alter table behavioral_profile add column if not exists subject_id uuid references subjects (id) on delete cascade;
create index if not exists behavioral_profile_subject_idx on behavioral_profile (subject_id, trait_key);

-- RLS — server/facilitator side only, same as the rest of the spine.
alter table subjects enable row level security;

comment on column behavioral_profile.subject_id is
  'Phase 9 — cross-session accumulation key. Trajectory spans all of a subject''s '
  'sessions; participant_id/last_session_id record the most recent writer.';
