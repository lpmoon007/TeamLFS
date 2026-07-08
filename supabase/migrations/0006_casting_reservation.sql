-- =============================================================================
-- The Signal — Casting reservation (Vision & Roadmap, Horizon 0: "unified engine
-- + casting — seat ≠ participant; every seat Human-or-AI").
--
-- RESERVE NOW, don't build. The roadmap's discipline: reserve the hooks (profile,
-- casting, event richness) now so no later horizon needs a migration. Profile and
-- event richness are already reserved (0005); this reserves CASTING.
--
-- Model: a `participants` row is the OCCUPANT of a seat in a session — human OR AI.
--   * human seat: cast_kind='human', token set (magic link), agent_json = {}
--   * AI seat:    cast_kind='ai',    token null (no link),   agent_json = {config}
-- The full casting UX/orchestration is a later build; here we only ensure the schema
-- can express an AI-cast seat without a migration.
-- =============================================================================

-- An occupant is a human or an AI agent (extensible later, e.g. 'confederate').
create type cast_kind as enum ('human', 'ai');

alter table participants
  add column if not exists cast_kind  cast_kind not null default 'human',
  -- AI occupant config (persona ref, model, voice_id, autonomy level, …). Empty for humans.
  add column if not exists agent_json jsonb not null default '{}'::jsonb;

-- AI-cast seats have no magic-link token. Humans still do; token stays unique.
alter table participants alter column token drop not null;

comment on table participants is
  'Seat OCCUPANT for one session — human OR AI (seat ≠ participant). cast_kind + '
  'agent_json reserve the Human-or-AI casting hook (Roadmap Horizon 0); token is the '
  'human magic-link (null for AI seats). unique(session_id, seat_id) still binds one '
  'occupant per seat.';
comment on column participants.cast_kind is 'human = real person via magic link; ai = agent-cast seat.';
comment on column participants.agent_json is 'AI-cast seat config (persona/model/voice/autonomy). Empty for humans.';
