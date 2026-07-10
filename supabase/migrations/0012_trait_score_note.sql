-- =============================================================================
-- The Signal / TLFS — human-coder rationale on trait scores.
--
-- The human coding surface (Behavioral Memory Spine §3.3) lets a trained coder score
-- a participant's traits from the same cited evidence the AI read. A free-text note
-- captures WHY — the rationale that makes AI-vs-human disagreements adjudicable, not
-- just countable. Nullable + additive; the AI/heuristic coders leave it null.
-- =============================================================================

alter table trait_scores add column if not exists note text;

comment on column trait_scores.note is
  'Optional coder rationale (human coding surface). Null for AI/heuristic rows.';
