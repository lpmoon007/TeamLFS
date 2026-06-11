-- =============================================================================
-- The Signal — Phase 1: Row Level Security
--
-- Access model for Phase 1 (per handoff §2A "token resolves server-side"):
--   * The participant magic-link token is resolved SERVER-SIDE (Edge Functions /
--     server actions using the service_role key, which BYPASSES RLS). That is the
--     primary read/write path for the live participant experience.
--   * RLS is therefore default-DENY for the anon/authenticated roles on all
--     tables; nothing is publicly readable or writable by a browser anon client.
--   * As a convenience for the optional Supabase Auth layer (§2A "auth just proves
--     identity"), an authenticated user MAY read the rows tied to their own
--     participant record (their session/seat/threads/messages/emails/calls).
--
-- The capture log (events) is never client-readable here — debrief tooling reads
-- it via the service role / facilitator dashboard (later phase).
-- =============================================================================

-- Enable RLS everywhere (default deny once enabled, no permissive policy = no access).
alter table organizations enable row level security;
alter table scenarios     enable row level security;
alter table seats         enable row level security;
alter table contacts      enable row level security;
alter table documents     enable row level security;
alter table injects       enable row level security;
alter table sessions      enable row level security;
alter table participants  enable row level security;
alter table threads       enable row level security;
alter table messages      enable row level security;
alter table emails        enable row level security;
alter table calls         enable row level security;
alter table call_turns    enable row level security;
alter table inject_fires  enable row level security;
alter table events        enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: is the current authenticated user the owner of this session's seat?
-- -----------------------------------------------------------------------------
create or replace function current_user_in_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from participants p
    where p.session_id = p_session_id
      and p.user_id = auth.uid()
  );
$$;

create or replace function current_user_owns_seat(p_session_id uuid, p_seat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from participants p
    where p.session_id = p_session_id
      and p.seat_id = p_seat_id
      and p.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Authenticated participant read policies (optional auth layer)
-- -----------------------------------------------------------------------------

-- A participant can read their own participant row(s).
create policy participants_self_select on participants
  for select to authenticated
  using (user_id = auth.uid());

-- ... and the session they belong to.
create policy sessions_member_select on sessions
  for select to authenticated
  using (current_user_in_session(id));

-- ... their own threads / messages / emails / calls (scoped to their seat).
create policy threads_owner_select on threads
  for select to authenticated
  using (current_user_owns_seat(session_id, seat_id));

create policy messages_owner_select on messages
  for select to authenticated
  using (
    exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and current_user_owns_seat(t.session_id, t.seat_id)
    )
  );

create policy emails_owner_select on emails
  for select to authenticated
  using (current_user_owns_seat(session_id, seat_id));

create policy calls_owner_select on calls
  for select to authenticated
  using (current_user_owns_seat(session_id, seat_id));

create policy call_turns_owner_select on call_turns
  for select to authenticated
  using (
    exists (
      select 1 from calls c
      where c.id = call_turns.call_id
        and current_user_owns_seat(c.session_id, c.seat_id)
    )
  );

-- Authored scenario content the participant's seat needs (read-only).
-- Scenario/seat/contacts/documents tied to a session the user is in.
create policy scenarios_member_select on scenarios
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = scenarios.id
        and current_user_in_session(s.id)
    )
  );

create policy seats_member_select on seats
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = seats.scenario_id
        and current_user_in_session(s.id)
    )
  );

create policy contacts_member_select on contacts
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = contacts.scenario_id
        and current_user_in_session(s.id)
    )
  );

create policy documents_member_select on documents
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.scenario_id = documents.scenario_id
        and current_user_in_session(s.id)
    )
  );

-- NOTE: no INSERT/UPDATE/DELETE policies for anon/authenticated are defined.
-- All writes (sending a message, marking email read, logging an event, firing an
-- inject, etc.) go through the service_role on the server, which bypasses RLS.
-- The capture log `events`, `injects`, `inject_fires`, `organizations`, and
-- `participants.*` writes are intentionally server-only for Phase 1.
