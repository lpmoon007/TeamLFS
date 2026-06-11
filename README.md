# The Signal — Production Build

Re-housing the working prototype (a crisis-simulation training experience) into a
real client/server stack: **Vercel (UI) · Supabase (data/realtime/auth/edge) ·
Edge Functions (AI/voice) · make.com (glue)**. See the production handoff doc for
the full spec — the prototype is the spec, this is the re-housing.

> Build order is **phased** (handoff §10). We do one phase, verify it, then move on.

## Status

| Phase | What | State |
|------:|------|-------|
| 1 | **Schema + auth** in Supabase; seed one scenario | ✅ schema done · ⚠️ seed is placeholder (see below) |
| 2 | Participant read path (render a seat from DB, Realtime subscribe) | ⬜ next |
| 3 | Messaging + presence live | ⬜ |
| 4 | Email + documents (approve/return → events) | ⬜ |
| 5 | Inject firing (manual, then make.com) | ⬜ |
| 6 | Voice (npc-reply + tts Edge Functions; call overlay) | ⬜ |
| 7 | Capture-log hardening + minimal debrief view | ⬜ |
| 8 | Facilitator dashboard (separate phase) | ⬜ |

## ⚠️ Phase 1 blocker — prototype seat files not provided

The handoff says to seed one scenario by **porting `seats/*.js`** (plus `voices.js`
for `contacts.voice_id`). Those prototype files (`InCommand - The Signal.html`,
`incommand.css`, `call.js`, `voices.js`, `seats/*.js`, `Scenario Design Kit.html`)
were **not present in this repo** when Phase 1 was built. The schema below is
complete and faithful to handoff §4, but `supabase/seed.sql` currently contains
**clearly-labeled placeholder data**, not the real scenario — porting the real
identities, contacts, personas, voice IDs, documents and injects requires those
source files. Drop them into the repo (e.g. a `prototype/` folder) and the seed
can be replaced with the real port.

## What's in this repo (Phase 1)

```
supabase/
  config.toml                      local dev config (supabase start / db reset)
  migrations/
    0001_initial_schema.sql        full data model (handoff §4)
    0002_rls.sql                   RLS: default-deny; server (service_role) is the
                                   write path; optional auth read of own seat data
    0003_realtime.sql              Realtime publication for live tables (§6)
  seed.sql                         ⚠️ PLACEHOLDER scenario (replace with seats/*.js port)
.env.example                       required env vars (handoff §0)
```

### Data model (handoff §4)

- **Authored content** (seeded from `seats/*.js`): `organizations`, `scenarios`,
  `seats`, `contacts` (NPC persona + ElevenLabs `voice_id`), `documents`, `injects`.
- **Live run state**: `sessions`, `participants` (opaque magic-link `token`),
  `threads`, `messages`, `emails`, `calls`, `call_turns`, `inject_fires`.
- **The capture log**: `events` — append-only (enforced by a DB trigger). This is
  the product's value; the debrief reads from here.

### Access model (RLS)

Per handoff §2A the magic-link **token resolves server-side**. RLS is **default
deny** for browser (`anon`/`authenticated`) roles; all live writes go through the
`service_role` (Edge Functions / server actions), which bypasses RLS. The optional
Supabase Auth layer lets an authenticated user *read* the rows tied to their own
participant record. `events`/`injects`/`inject_fires` are server-only.

## Running locally

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start          # boots local Postgres + Studio + Realtime
supabase db reset       # applies migrations/ then seed.sql
```

The migrations were validated against PostgreSQL 16 (all apply cleanly; the
append-only `events` guard verified).

## Open decisions (handoff §11) — proposed defaults

1. **UI stack:** one Vercel/React (Next.js) codebase for both UIs *(recommended)*.
2. **Onboarding:** magic-link pre-assignment *(recommended)*, optional Supabase Auth on top.
3. **STT:** Web Speech API (Chrome/Edge) with typed fallback; Whisper Edge Fn later for cross-browser.

These aren't locked — confirm before Phase 2.
