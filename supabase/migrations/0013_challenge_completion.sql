-- =============================================================================
-- The Signal / TLFS — 30-Day Challenge completion callback.
--
-- When a participant finishes a solo run, the debrief deep-links them into Be
-- Legendary's "Your 30-Day Challenge" (challenge.belegendary.org) carrying an
-- opaque `ref` (the solo session id). Thirty days later the challenge app POSTs a
-- small results summary back to us at /api/challenge/webhook, keyed on that `ref`.
--
-- This table stores what comes back. Server-only (service role writes it from the
-- webhook route); RLS default-deny like every other table (0002_rls). Additive.
-- =============================================================================

create table if not exists challenge_completions (
  ref          text primary key,           -- the opaque id we sent as ?ref= (the solo session id)
  session_id   uuid,                        -- parsed from ref when it's a session uuid (else null)
  days_logged  integer,                     -- scored check-ins over the 30 days
  week1_avg    numeric,                     -- avg daily effort, days 1–7
  week4_avg    numeric,                     -- avg daily effort, days 22–28
  payload      jsonb,                        -- the raw callback body, for audit
  received_at  timestamptz not null default now()
);

comment on table challenge_completions is
  '30-Day Challenge results round-tripped back from challenge.belegendary.org, keyed on the opaque ref (solo session id) we deep-linked with. Written server-side by /api/challenge/webhook.';

-- Default-deny: no policy = no anon/authenticated access. The webhook route uses
-- the service role, which bypasses RLS.
alter table challenge_completions enable row level security;
