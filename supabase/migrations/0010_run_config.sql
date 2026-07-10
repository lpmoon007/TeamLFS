-- =============================================================================
-- Run-level config (Addendum A3.2) — disposition is a RUN dial, not a seat attribute.
--
-- The scenario declares the available NPC dispositions (served | on-request |
-- guarded | surprise) in its content; a *run* picks one that governs the NPCs, and
-- per A3.2 the *effective* disposition resolves per (npc_seat × participant) from the
-- behavioral_profile at runtime (trust carried in). None of that belongs on a seat
-- row — it lives on the session.
--
--   sessions.run_config holds the run default (+ facilitator overrides), e.g.
--   { "disposition": "guarded" }. The Director/referee reads it, then lets the
--   per-(npc × participant) profile read override it once profiles have history.
-- =============================================================================

alter table sessions add column if not exists run_config jsonb not null default '{}'::jsonb;

comment on column sessions.run_config is
  'Run-level dials (A3.2): chosen NPC disposition (served|request|guarded|surprise) '
  'and other per-run settings. Effective disposition is resolved per (npc_seat × '
  'participant) from behavioral_profile at runtime; this is the run default/override.';
