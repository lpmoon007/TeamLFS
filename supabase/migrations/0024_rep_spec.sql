-- =============================================================================
-- TLFS — the 30-Day Rep spec (Screen-14 handoff, "BUILD THIS ONE"). Evolves the existing
-- challenges/challenge_checkins into the spec's commitments/checkins shape without a parallel
-- table. The load-bearing addition is target_marker (NOT the same as the free-text focus): it
-- is REQUIRED for a rep going forward, because it is what makes the promise ledger and the
-- gap-vs-invariant test possible — at run N+1 we compare movement in THAT marker, and an
-- invariant may only be asserted after a rep whose target_marker matched a claim failed to move.
-- Additive; existing rows keep working (target_marker backfills from focus_key where it's a key).
-- =============================================================================

alter table challenges add column if not exists target_marker   text;    -- one of the six Tier-A keys (A1–A6)
alter table challenges add column if not exists source_claim_id uuid references profile_claims (id) on delete set null;
alter table challenges add column if not exists obstacle        text;    -- named-in-advance blocker (week-two nudge is built from this)
alter table challenges add column if not exists outcome         text
  check (outcome is null or outcome in ('kept', 'partial', 'not_kept'));  -- graded at day 30
create index if not exists challenges_target_marker_idx on challenges (subject_id, target_marker);

-- check-ins become a 1–10 effort rating on a specific day (1–30), not a bare did/didn't.
alter table challenge_checkins add column if not exists day    integer;  -- 1..30
alter table challenge_checkins add column if not exists rating integer
  check (rating is null or (rating >= 1 and rating <= 10));

comment on column challenges.target_marker is 'The Tier-A marker (A1–A6) this rep aims to move — required for new reps; drives the promise ledger and the gap-vs-invariant test.';
comment on column challenges.obstacle is 'What the leader named in advance as most likely to stop them — quoted back on a week-two dip.';
comment on column challenge_checkins.rating is '1–10 effort rating for the day. A ≤3 or ≥8 triggers one follow-up note.';
