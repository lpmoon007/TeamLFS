#!/usr/bin/env bash
# Regenerate deploy/bootstrap.sql = public-schema reset + migrations 0001-0008 + seed.
# Run from repo root:  ./scripts/build-bootstrap.sh
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/seed/build_seed.mjs   # ensure seed.sql is current

BS=deploy/bootstrap.sql
mkdir -p deploy
{
  cat <<'HDR'
-- =============================================================================
-- The Signal — one-shot bootstrap for a Supabase project.
-- Paste into the Supabase SQL Editor and Run. It:
--   1) RESETS the public schema (drops any prior build), then
--   2) applies migrations 0001-0008, then
--   3) seeds the "The Signal" scenario (+ a demo session for testing).
-- Generated — do not hand-edit; regenerate with scripts/build-bootstrap.sh.
-- =============================================================================

-- ---- 1. RESET public schema ----
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

HDR
  for f in supabase/migrations/0001_initial_schema.sql \
           supabase/migrations/0002_rls.sql \
           supabase/migrations/0003_realtime.sql \
           supabase/migrations/0004_contacts_meta.sql \
           supabase/migrations/0005_behavioral_spine.sql \
           supabase/migrations/0006_casting_reservation.sql \
           supabase/migrations/0007_email_decisions.sql \
           supabase/migrations/0008_inject_resolution.sql \
           supabase/migrations/0009_solo_engine.sql \
           supabase/migrations/0010_run_config.sql; do
    printf '\n-- ==== %s ====\n\n' "$(basename "$f")"
    cat "$f"
  done
  printf '\n-- ==== seed.sql ====\n\n'
  cat supabase/seed.sql
} > "$BS"

echo "Wrote $BS ($(wc -l < "$BS") lines)."
