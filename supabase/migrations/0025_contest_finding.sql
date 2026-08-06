-- =============================================================================
-- TLFS — contest-a-finding (Screen-14 READ FIRST §3: "contested needs to be a real claim
-- status"). When a leader says a finding doesn't fit, that must PERSIST — the next run tests
-- the contested claim first, and the coach is told so it argues the evidence rather than
-- restating the claim. Modelled as flags on the open claim (it stays open, awaiting test),
-- not a new status value, so the open/graded ledger partition is unchanged. Additive.
-- =============================================================================

alter table profile_claims add column if not exists contested_at timestamptz;
alter table profile_claims add column if not exists contest_note text;  -- the leader's own words on why it doesn't fit
create index if not exists profile_claims_contested_idx on profile_claims (subject_id) where contested_at is not null;

comment on column profile_claims.contested_at is 'Set when the leader contests the finding — the next run tests it first and the coach is told.';
comment on column profile_claims.contest_note is 'The leader''s stated reason the finding does not fit; the coach argues this, not the claim.';
