-- =============================================================================
-- TLFS — real facilitator/admin accounts. Replaces the single shared FACILITATOR_SECRET
-- with per-person accounts (email + salted-scrypt password), revocable DB-backed sessions,
-- and roles ('admin' can manage accounts; 'facilitator' runs the console). The legacy
-- secret keeps working as a bootstrap master key (so nothing breaks and there's always a
-- way in to create the first real admin) — see lib/auth.ts.
--
-- Additive. Passwords are never stored plaintext; sessions are opaque tokens with expiry.
-- =============================================================================

create table facilitators (
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

create table facilitator_sessions (
  token          text primary key,                   -- opaque random cookie value
  facilitator_id uuid not null references facilitators (id) on delete cascade,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);
create index facilitator_sessions_fac_idx on facilitator_sessions (facilitator_id);
create index facilitator_sessions_exp_idx on facilitator_sessions (expires_at);

alter table facilitators         enable row level security;
alter table facilitator_sessions enable row level security;

comment on table facilitators is
  'Admin/facilitator accounts (email + scrypt password + role). The legacy FACILITATOR_SECRET '
  'still works as a bootstrap master key; real accounts are managed from the console.';
comment on table facilitator_sessions is 'Opaque, revocable session tokens for facilitator accounts.';
