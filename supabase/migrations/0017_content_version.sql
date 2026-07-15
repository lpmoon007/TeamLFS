-- =============================================================================
-- TLFS — scenario content versioning. Scenarios are the measuring instrument; their
-- authored content is created off-site (design) and written in via the seed pipeline. To
-- keep historical runs interpretable when content is edited, we stamp a version:
--   * scenario_meta.content_version — the scenario's CURRENT authored version (bumped by a
--     non-destructive content patch; see scripts/seed/build_solo_patch.mjs).
--   * sessions.content_version — FROZEN at session creation from the scenario's current
--     version, so a run's debrief/panel always reads against the content it was played on.
-- Additive; existing rows default to 1 / null (back-filled at next session create).
-- =============================================================================

alter table scenario_meta add column if not exists content_version integer not null default 1;
alter table sessions      add column if not exists content_version integer;

comment on column scenario_meta.content_version is
  'Current authored content version. Bumped by a non-destructive content patch; a full '
  're-seed resets it to 1 (a fresh install).';
comment on column sessions.content_version is
  'The scenario content_version this session was played on (frozen at create) — so runs '
  'stay interpretable after the scenario is edited.';
