-- =============================================================================
-- TLFS — the 30-day behavioral challenge. The debrief names one habit that would move
-- a leader's weakest read ("stop at the first answer, or mine the second?"). This is the
-- bridge from insight to change: the player commits to that one behavior for 30 days, and
-- can log check-ins as they practice it in the real world.
--
-- Additive. A challenge is owned by the participant who ran the crisis (resolved from the
-- solo token, or the human seat when a facilitator opens the debrief). Accessed only through
-- server actions on the service-role client, so RLS is on with no public policy (deny anon).
-- =============================================================================

create table if not exists challenges (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid references sessions (id) on delete set null,   -- the run that sparked it
  scenario_id    uuid,                                               -- for "what were you working on"
  participant_id uuid,                                               -- who committed (nullable)
  focus_key      text,                                               -- dimension/marker it targets (e.g. information_discipline)
  focus_label    text,                                               -- human label of that read
  behavior       text not null,                                      -- the one behavior they're changing
  cue            text,                                               -- optional if-then trigger ("before I decide, I ask…")
  target_days    integer not null default 30,
  status         text not null default 'active',                     -- active | done | abandoned
  created_at     timestamptz not null default now()
);
create index if not exists challenges_session_idx     on challenges (session_id);
create index if not exists challenges_participant_idx on challenges (participant_id);

create table if not exists challenge_checkins (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges (id) on delete cascade,
  did           boolean not null default true,                       -- practiced it today, or a missed-day note
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists challenge_checkins_challenge_idx on challenge_checkins (challenge_id);

alter table challenges         enable row level security;
alter table challenge_checkins enable row level security;

comment on table challenges is
  'A 30-day behavioral challenge a leader commits to after a debrief — one habit, drawn from '
  'their weakest read, practiced over 30 days with optional check-ins.';
comment on table challenge_checkins is 'Per-day practice log for a challenge (did-it + optional note).';
