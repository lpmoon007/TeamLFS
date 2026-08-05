-- =============================================================================
-- TLFS — tag each scenario with the Tier-A markers it pressures most, so the profile's
-- next-scenario nudge can be content-aware: recommend the run that tests a leader's weakest
-- read, not just a scenario a notch up in difficulty. Marker keys are the six Tier-A markers:
--   A1 Information-seeking · A2 Decision calibration · A3 Consultation breadth
--   A4 Truth-seeking over comfort · A5 Intent–action integrity · A6 Composure under escalation
-- (A5 is not captured in solo, so it is never used as a tag here.)
--
-- The seed values below are a considered first pass drawn from each scenario's authored
-- "The test:" line — an admin can refine them in the scenario editor. Additive; keyed by
-- title so it applies regardless of per-deploy scenario ids.
-- =============================================================================

alter table scenario_meta add column if not exists stresses text[] not null default '{}';

update scenario_meta sm set stresses = v.tags from (values
  ('Backlash',   '{A6,A4,A2}'::text[]),  -- viral crisis, who gets punished — composure, honesty, timing
  ('Blackout',   '{A1,A6,A4}'::text[]),  -- hospital down, vendor withholding — get the facts under fire
  ('Colony',     '{A3,A2,A6}'::text[]),  -- hold a camp together as stores shrink — breadth, calibration
  ('Exodus',     '{A4,A2,A3}'::text[]),  -- standard vs human cost before your best leave — truth over comfort
  ('Expedition', '{A2,A4,A6}'::text[]),  -- sunk cost on the mountain — the turn-around call
  ('Handover',   '{A4,A3,A2}'::text[]),  -- hand over truth + authority — let go, empower
  ('Overdrive',  '{A1,A4,A2}'::text[]),  -- the cost no one is measuring — go measure it
  ('Relay',      '{A3,A1,A2}'::text[]),  -- can't read the science, four handoffs — rely, seek
  ('Ridgeline',  '{A4,A2,A3}'::text[]),  -- tell the funder no, ration the resource — truth over comfort
  ('Salvage',    '{A1,A2,A4}'::text[]),  -- frightened crew, data withheld — dig, triage, honesty
  ('Shockwave',  '{A3,A4,A6}'::text[]),  -- team openness earned by trust — breadth, honesty
  ('Squeeze',    '{A4,A3,A2}'::text[]),  -- distribute the pain fairly + tell the truth
  ('The Signal', '{A3,A2,A1}'::text[]),  -- coordinated executive response — breadth, calibration
  ('Vault',      '{A1,A2,A6}'::text[])   -- a failure no instrument describes — synthesise, decide
) as v(title, tags)
join scenarios s on s.title = v.title
where sm.scenario_id = s.id;

comment on column scenario_meta.stresses is
  'Tier-A marker keys (A1–A6) this scenario pressures most — drives the content-aware '
  'next-scenario recommendation. Authored/refined in the scenario editor.';
