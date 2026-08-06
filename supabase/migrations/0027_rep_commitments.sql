-- =============================================================================
-- TLFS — 30-Day Rep (INTEGRATION, not a build). The 30-Day Challenge is a finished
-- product at challenge.belegendary.org (signup, morning nudge, 4pm rating, consistency %,
-- coach view). TeamLFS owns the PRESCRIPTION only: it generates a rep from the leader's gap,
-- captures the obstacle, stores the commitment, and hands off to the challenge with the rep
-- prefilled. It sends no texts, tracks no daily ratings, keeps no streaks. The only thing we
-- read back is consistency — and only so the next profile can pair it with marker movement
-- (the promise ledger, the closest thing to a direct measure of coachability).
-- =============================================================================

create table if not exists rep_commitments (
  id               uuid primary key default gen_random_uuid(),
  subject_id       uuid not null references subjects (id) on delete cascade,
  rep_text         text not null,               -- the one-sentence rep, derived from their record
  target_marker    text not null,               -- one of the six markers — the UNSOLVED half of the gap
  source_claim_id  uuid references profile_claims (id) on delete set null, -- the finding it answers, if any
  obstacle         text,                         -- "what will most likely stop you" — named in advance
  committed_at     timestamptz not null default now(),
  status           text not null default 'committed', -- committed | complete | abandoned
  -- consistency comes BACK from the challenge (webhook / lookup / self-report). Null until then.
  days_logged      int,
  week1_avg        numeric,
  week4_avg        numeric,
  outcome          text,                         -- kept (>=21) | partial (10-20) | not_kept (<10)
  reported_via     text,                         -- webhook | lookup | self_report (two-sources rule)
  updated_at       timestamptz not null default now()
);

create index if not exists rep_commitments_subject_idx on rep_commitments (subject_id, committed_at desc);

alter table rep_commitments enable row level security;
-- server-only access via the service role (same posture as profile_claims); no anon policy.

comment on table rep_commitments is 'The prescription half of the 30-day rep. Delivery + rating live at challenge.belegendary.org; this stores what was prescribed and, once it returns, how consistently it was kept.';
comment on column rep_commitments.target_marker is 'The six-marker key the rep trains — must be the unsolved half of the gap, never a marker already at ceiling.';
comment on column rep_commitments.reported_via is 'How consistency came back — webhook/lookup/self_report. Self-reported figures are never cited as observed behaviour (two-sources rule).';
