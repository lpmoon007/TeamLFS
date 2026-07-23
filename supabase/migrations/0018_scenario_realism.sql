-- =============================================================================
-- TLFS — scenario realism band. A scenario is either 'realistic' (a real-world org crisis:
-- Backlash, Shockwave, Blackout…) or 'abstract' (an allegorical survival setting: Colony,
-- Expedition, Vault…). Authored per scenario, shown as a tag + filter in the library.
-- Additive; existing rows default to 'realistic'. Seeds set it per scenario; a live DB can
-- be back-filled non-destructively via supabase/scenario_realism.sql.
-- =============================================================================

alter table scenario_meta add column if not exists realism text not null default 'realistic';

comment on column scenario_meta.realism is
  'realistic | abstract — the scenario''s setting band. Authored; editable in the admin.';
