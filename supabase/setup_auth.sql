-- =============================================================================
-- TLFS — facilitator/admin ACCOUNTS catch-up (migration 0015, idempotent).
-- Paste into the Supabase SQL editor and Run.
--
-- Email + password login for facilitators needs these two tables. If they're missing on
-- your live DB, the app silently falls back to the master key (so you can get in, but no
-- facilitator can sign in with email/password, and account creation can't persist). This
-- creates them if absent and is a harmless no-op if they already exist.
-- =============================================================================

create table if not exists facilitators (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,               -- stored lowercased
  password_hash  text not null,                      -- 'scrypt$<salt-hex>$<hash-hex>'
  display_name   text,
  role           text not null default 'facilitator',-- 'admin' | 'facilitator'
  org_id         uuid references organizations (id) on delete set null,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table if not exists facilitator_sessions (
  token          text primary key,                   -- opaque random cookie value
  facilitator_id uuid not null references facilitators (id) on delete cascade,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);
create index if not exists facilitator_sessions_fac_idx on facilitator_sessions (facilitator_id);
create index if not exists facilitator_sessions_exp_idx on facilitator_sessions (expires_at);

alter table facilitators         enable row level security;
alter table facilitator_sessions enable row level security;

-- confirmation: both should come back non-null after this runs
select to_regclass('public.facilitators')         as facilitators_table,
       to_regclass('public.facilitator_sessions')  as sessions_table;
