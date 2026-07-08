-- =============================================================================
-- The Signal — Phase 1: contacts.meta
--
-- The voice casting sheet carries direction (sex/age/accent/tone/pace + a sample
-- line) that is NOT the LLM persona and NOT yet a concrete ElevenLabs voice_id.
-- Give contacts a jsonb `meta` to hold that casting intent (and any other authoring
-- metadata) so persona stays a clean system-prompt fragment and voice_id stays the
-- concrete provider id (assigned later when ElevenLabs voices are picked).
-- =============================================================================

alter table contacts add column if not exists meta jsonb not null default '{}'::jsonb;
