# The Signal — Production Build

Re-housing the working prototype (a crisis-simulation training experience) into a
real client/server stack: **Vercel (UI) · Supabase (data/realtime/auth/edge) ·
Edge Functions (AI/voice) · make.com (glue)**. See the production handoff doc for
the full spec — the prototype is the spec, this is the re-housing.

> Build order is **phased** (handoff §10). We do one phase, verify it, then move on.

## Status

| Phase | What | State |
|------:|------|-------|
| 1 | **Schema + auth** in Supabase; seed one scenario | ✅ done — schema + real "The Signal" seed |
| 2 | Participant read path (render a seat from DB, Realtime subscribe) | ⬜ next |
| 3 | Messaging + presence live | ⬜ |
| 4 | Email + documents (approve/return → events) | ⬜ |
| 5 | Inject firing (manual, then make.com) | ⬜ |
| 6 | Voice (npc-reply + tts Edge Functions; call overlay) | ⬜ |
| 7 | Capture-log hardening + minimal debrief view | ⬜ |
| 8 | Facilitator dashboard (separate phase) | ⬜ |

## The seed — "The Signal" (Champion Iron executive team)

`supabase/seed.sql` is **generated** from `scripts/seed/build_seed.mjs`, which holds
the scenario v1.0 as structured data and emits SQL with correct escaping. Regenerate:

```bash
node scripts/seed/build_seed.mjs
```

It seeds: 1 org, the scenario, **7 seats** (David/Alex/Steve/Michael/François/Angela/
Noémie), **19 contacts** (14 callable voiced NPCs incl. the shared Paul Arsenault +
text-only desks), **9 documents** (opening brief + 7 role briefs + 1 attachment), and
**66 injects** — the per-participant T=0 private info, opening NPC messages, the full
timed/conditional escalation cadence, and the 4 propagation triggers. Message bodies
are verbatim. A demo session + one magic-link token per seat are included for Phase 2
read-path testing.

Notes:
- **Voice IDs are set** from the casting sheet — every callable NPC has an ElevenLabs
  `voice_id` (13 distinct voices; Paul Arsenault shared across two seats). Casting
  direction (sex/age/accent/tone/sample) is also retained in `contacts.meta.voice`. The
  `npc-reply`/`tts` Edge Functions read `persona` / `voice_id`.
- **Naming is reconciled** to the canonical *Nordveil Iron AS* / *Fermont* (the draft's
  earlier *Rana Gruber* / *Vermont* aliases are normalized throughout).

## What's in this repo (Phase 1)

```
supabase/
  config.toml                      local dev config (supabase start / db reset)
  migrations/
    0001_initial_schema.sql        full data model (handoff §4)
    0002_rls.sql                   RLS: default-deny; server (service_role) is the
                                   write path; optional auth read of own seat data
    0003_realtime.sql              Realtime publication for live tables (§6)
    0004_contacts_meta.sql         contacts.meta (voice casting direction)
  seed.sql                         GENERATED — "The Signal" scenario (do not hand-edit)
scripts/seed/build_seed.mjs        seed authoring source-of-truth (edit + regenerate)
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
