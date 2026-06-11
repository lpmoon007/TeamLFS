-- =============================================================================
-- The Signal — Phase 1 seed
--
-- ⚠️  PLACEHOLDER DATA — NOT the real scenario.
--
-- The production handoff says to seed ONE scenario by porting `seats/*.js`.
-- Those prototype files were NOT provided to this repo, so the real identities,
-- contacts, personas, voice_ids, documents and injects could not be ported
-- without fabricating the scenario's content.
--
-- This file instead seeds a minimal, clearly-fake EXAMPLE so the schema, RLS,
-- Realtime and the Phase 2 read path are all exercisable end-to-end. Replace the
-- INSERTs below with the porting of `seats/*.js` once those files are available.
-- The structure (org → scenario → seats → contacts → documents → injects, plus a
-- demo session + participant tokens) mirrors exactly what the real port produces.
-- =============================================================================

begin;

-- --- Authored content -------------------------------------------------------

insert into organizations (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Example Org');

insert into scenarios (id, org_id, title, summary) values
  ('00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000000000a1',
   'The Signal (EXAMPLE seed — replace with seats/*.js port)',
   'Placeholder scenario used only to validate Phase 1 schema + read path.');

insert into seats (id, scenario_id, key, name, role) values
  ('00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000b1', 'david', 'David (example)', 'Incident Lead'),
  ('00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-0000000000b1', 'alex',  'Alex (example)',  'Comms');

insert into contacts
  (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener)
values
  ('00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
   'duty_officer', 'Duty Officer', 'Ops', 'INTERNAL', '#3b82f6', true,
   'You are the duty officer. Terse, factual, slightly stressed.',
   'REPLACE_WITH_ELEVENLABS_VOICE_ID',
   'Duty officer here — go ahead.');

insert into documents (id, scenario_id, key, title, body_json) values
  ('00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000b1', 'sitrep_01', 'SITREP 01',
   '{"sections":[{"heading":"Summary","text":"Example document body."}]}'::jsonb);

insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values
  ('00000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
   'message', '{"contact_key":"duty_officer","body":"Example opening message."}'::jsonb, 0),
  ('00000000-0000-0000-0000-0000000000f2',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
   'situation', '{"text":"Example situation-feed beat."}'::jsonb, 1);

-- --- A demo live session + participant magic-link tokens ---------------------

insert into sessions (id, scenario_id, status, started_at) values
  ('00000000-0000-0000-0000-000000000a01',
   '00000000-0000-0000-0000-0000000000b1', 'live', now());

insert into participants (id, session_id, seat_id, token, name, email) values
  ('00000000-0000-0000-0000-000000000b01',
   '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000c1',
   'example-token-david-REPLACE', 'David Demo', 'david@example.org'),
  ('00000000-0000-0000-0000-000000000b02',
   '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000c2',
   'example-token-alex-REPLACE',  'Alex Demo',  'alex@example.org');

commit;
