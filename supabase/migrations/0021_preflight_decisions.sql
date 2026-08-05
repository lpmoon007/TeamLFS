-- =============================================================================
-- TLFS — "Before You Decide" pre-flight: logged real-world decisions + their check-back.
-- The pre-flight points the profile forward at an ACTUAL decision the leader is about to
-- make at work. It reasons about their PATTERN, never their situation, and hands them the
-- questions their record says they'll skip + a behavioural prediction. Logging it turns the
-- prediction into evidence: two weeks on, "did that happen?" — a confirmed prediction is the
-- strongest evidence in the record (held-in-practice, not just in-simulation); a wrong one
-- narrows the underlying claim.
--
-- Additive; keyed on the subject (the person). Service-role only (RLS on, no public policy).
-- =============================================================================

create table if not exists preflight_decisions (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects (id) on delete cascade,
  text        text not null,                         -- the decision, in their words
  lands_on    text,                                  -- who it lands hardest on (optional)
  when_label  text,                                  -- when it must be called
  question    text,                                  -- the first question they were handed
  prediction  text,                                  -- the behavioural prediction (about them, never a business outcome)
  verdict     text check (verdict in ('yes', 'no')), -- check-back: did the prediction hold?
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists preflight_decisions_subject_idx on preflight_decisions (subject_id, created_at);

alter table preflight_decisions enable row level security;

comment on table preflight_decisions is
  'Real-world decisions run through the Before-You-Decide pre-flight, with a two-week check-back '
  'that turns a behavioural prediction into held-in-practice evidence (or narrows the claim).';
