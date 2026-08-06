-- =============================================================================
-- TLFS — finding mechanism layer (Screen-15 §2g). A finding states WHAT you do; the
-- mechanism states WHY it matters — the one-line causal read that turns an observation
-- into something a leader can act on ("you reach the room but stop at the loudest voice,
-- so the person who actually holds the fact never gets asked"). Grounded in the record,
-- generated alongside the finding, and dropped if it invents specifics. Additive, nullable
-- so existing findings (and any lagging DB) simply carry no mechanism rather than erroring.
-- =============================================================================

alter table profile_claims add column if not exists mechanism text;

comment on column profile_claims.mechanism is 'One-line causal read under the finding — why the pattern matters / what it predicts. Grounded, nullable.';
