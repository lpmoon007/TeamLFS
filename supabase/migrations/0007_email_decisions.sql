-- =============================================================================
-- The Signal — Phase 4: document decisions on emails.
--
-- Emails can carry a document (attachment) the participant Approves / Returns /
-- Edits. The capture log (events: doc_approved | doc_returned | doc_edited) is the
-- canonical record; these columns denormalize the terminal decision onto the email
-- so the UI and debrief can render it without replaying the event log.
-- =============================================================================

alter table emails
  add column if not exists decision      text
    check (decision in ('approved', 'returned')),   -- terminal decision (edit is not terminal)
  add column if not exists decision_json jsonb not null default '{}'::jsonb,  -- reason, edited body, …
  add column if not exists decided_at    timestamptz;

comment on column emails.decision is
  'Terminal document decision (approved|returned). Edits are non-terminal and live in '
  'decision_json + doc_edited events. The events table is the canonical capture.';
