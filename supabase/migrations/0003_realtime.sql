-- =============================================================================
-- The Signal — Phase 1: Realtime publication
--
-- The participant UI subscribes to row changes for live delivery (§6):
--   * messages       — new chat / group messages
--   * emails         — email arrival + status changes (read/delivered)
--   * calls          — incoming/outbound call state
--   * call_turns     — live transcript turns during a call
--   * participants   — presence (present flag flips online/offline)
--   * inject_fires   — facilitator fired a beat
--
-- Presence/typing also use Supabase Realtime presence + broadcast channels
-- (no table needed for those ephemeral signals).
--
-- supabase_realtime is the default publication created by Supabase. We add the
-- tables the participant app needs to subscribe to. Guard each add so the
-- migration is idempotent across environments.
-- =============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'messages', 'emails', 'calls', 'call_turns', 'participants', 'inject_fires'
  ];
begin
  -- Create the publication if it does not exist (fresh/local projects).
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Ensure full row data on UPDATE/DELETE so the client sees changed columns
-- (e.g. emails.status pending → read).
alter table messages      replica identity full;
alter table emails        replica identity full;
alter table calls         replica identity full;
alter table call_turns    replica identity full;
alter table participants  replica identity full;
alter table inject_fires  replica identity full;
