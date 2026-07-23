-- =============================================================================
-- Scenario realism band (0018) — NON-DESTRUCTIVE patch. Sets scenario_meta.realism per
-- scenario without touching runs/sessions. Requires migration 0018.
-- =============================================================================
begin;
update scenario_meta set realism = 'realistic' where scenario_id = '03470703-3939-5f54-9cff-d4a9469dd881';  -- Backlash
update scenario_meta set realism = 'realistic' where scenario_id = 'e52843f0-7168-5934-95b0-f3c985b0e17b';  -- Blackout
update scenario_meta set realism = 'abstract' where scenario_id = '5bcabbbc-eb4a-5a0a-91e0-e0519d375553';  -- Colony
update scenario_meta set realism = 'realistic' where scenario_id = '6cca8cda-e3b2-5db0-8cba-37d2d291c067';  -- Exodus
update scenario_meta set realism = 'abstract' where scenario_id = '3447fee6-b4e9-539f-beb9-71e6f097ab6c';  -- Expedition
update scenario_meta set realism = 'realistic' where scenario_id = '7baa9166-cf5a-5836-89be-c401730fbc1d';  -- Handover
update scenario_meta set realism = 'realistic' where scenario_id = '6fb47119-8374-588e-baad-a403519b0bce';  -- Overdrive
update scenario_meta set realism = 'realistic' where scenario_id = 'c9f45196-31d7-5cf7-8a0a-1371bad99048';  -- Relay
update scenario_meta set realism = 'abstract' where scenario_id = 'd694fd70-b254-56af-b1e2-7147fa83c45c';  -- Ridgeline
update scenario_meta set realism = 'abstract' where scenario_id = 'c0025e86-747d-5386-a5ff-3924ca5350a6';  -- Salvage
update scenario_meta set realism = 'realistic' where scenario_id = '7ab2e6fc-b8fe-5c93-9084-22c2907ae915';  -- Shockwave
update scenario_meta set realism = 'realistic' where scenario_id = 'eaf60170-9529-52c0-af8f-eaed27b16fd4';  -- Squeeze
update scenario_meta set realism = 'abstract' where scenario_id = '8101c431-6e17-53ba-b8ea-49748b9f4508';  -- Vault
commit;
