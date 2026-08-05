-- =============================================================================
-- TLFS — give `challenges` a subject_id (it was keyed only by participant), so a 30-day rep
-- committed from the coach or the profile attributes to the person's behavioral-memory
-- profile, and the evidence pack's rep query (audit rule 1) can find it. Backfill existing
-- rows from the participant who committed them. Additive.
-- =============================================================================

alter table challenges add column if not exists subject_id uuid references subjects (id) on delete set null;
create index if not exists challenges_subject_idx on challenges (subject_id);

update challenges c
  set subject_id = p.subject_id
  from participants p
  where c.participant_id = p.id
    and c.subject_id is null
    and p.subject_id is not null;

comment on column challenges.subject_id is 'The person (cross-session identity) this rep belongs to — set alongside participant_id.';
