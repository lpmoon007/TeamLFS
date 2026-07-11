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
| 1b | **Behavioral Memory Spine** — lock event log, version traits, stub scoring | ✅ done — see below |
| 2 | Participant read path (render a seat from DB, Realtime subscribe) | ✅ done — Next.js app |
| 3 | Messaging + presence live | ✅ done — send + mirror + presence |
| 4 | Email + documents (approve/return → events) | ✅ done — read + Approve/Return/Edit |
| 5 | Inject firing (manual, then make.com) | ✅ done — fire-inject engine + endpoint |
| 6 | Voice (npc-reply + tts; call overlay) | ✅ done — STT → LLM → TTS loop |
| 7 | Capture-log hardening + minimal debrief view | ✅ done — omission sweep + debrief |
| 8 | Facilitator dashboard + debrief suite | ✅ done — control + team/film/wall |

> **Horizon 0 exit criterion reached:** a real session can run, capture rich raw
> events across all four channels, and produce a basic debrief. That's the platform.

## Facilitator + debrief suite (Phase 8 + Build Addendum)

- **Control:** `/facilitator` (cookie-gated sign-in → live session list) and
  `/facilitator/[sessionId]` (seat roster + presence, fire injects with Force, live
  event feed, **hand-drive an NPC**, End session → debrief snapshot).
- **Debrief suite** — one dataset (`buildDebrief`), three linked renderers:
  **team** (`/facilitator/debrief/[sessionId]` — communication map + cards),
  **game-film** (`…/[seatId]` — footage + LDOL v1 lens + trait scores, with breadcrumb
  and ‹/› paging), and **One Wall** (`…/wall` — projection with the facilitator reveal
  of the amber "never happened" edges).
- **Build Addendum A1 locked** (non-retrofittable): directed message edges +
  `inject_resolution` (per-seat delivered→addressed→ignored). **A1.4** "raised-then-
  overridden" reserved as a derived trait. See **`docs/build-addendum.md`**.

## Behavioral Memory Spine (the core IP)

The persistent record of how a person behaves under load — the moat (founder decision:
defensibility lives in the **engine**, not the lens). Three layers, built per its
design doc; **Layer 1 is locked because the event schema can't be retrofitted**:

- **Layer 1 — `events` (LOCKED, append-only):** maximal capture incl. the high-signal
  negatives (un-sent drafts, ignored threads, silence) + `inject_delivered` pairing.
  Enriched in `0005` (`seat_id`, `channel`, `scenario_ms`, `derived`, `ts`).
- **Layer 2 — traits (VERSIONED):** `trait_registry` (v0.1, all `hypothesis`),
  `trait_scores` (tagged `taxonomy_version` + `scorer_version`, cite `evidence_event_ids`).
- **Scoring function** (`lib/scoring/`) — its own module: reads Layer 1 only, AI-first
  seam, validated-vs-hypothesis gate. **The instrument, not a detail.**
- **`behavioral_profile`** reserved (empty); **`consents`** for capture/retention (§8).

Full notes: **`docs/behavioral-spine.md`** and **`lib/scoring/README.md`**.
One-line rule: *lock the event schema; version the traits; version the lens; treat
scoring as the instrument.*

## Firing injects (Phase 5)

Authored beats (`injects`) become live state via the **fire-inject engine**
(`lib/inject.ts`): it materializes the beat (message/email/situation/call/group) into
a runtime row per recipient, **broadcasts** it to the seat channel, records what fired
(`inject_fires`), and logs the paired **`inject_delivered`** event — so every downstream
behavior is tied to its stimulus (spine §4). A best-effort `cancelIf` skips a
no-response nag if the recipient already replied on that thread ("reply defuses the
nag").

Triggered manually now via a bearer-guarded endpoint (make.com schedules the *same*
endpoint later). Set `FACILITATOR_SECRET`, then:

```bash
# list fireable beats for a session
curl -H "Authorization: Bearer $FACILITATOR_SECRET" \
  "$APP_URL/api/facilitator/injects?sessionId=$SESSION_ID"

# fire one (force bypasses the cancelIf check)
curl -X POST -H "Authorization: Bearer $FACILITATOR_SECRET" -H 'Content-Type: application/json' \
  -d '{"sessionId":"'"$SESSION_ID"'","injectId":"'"$INJECT_ID"'"}' \
  "$APP_URL/api/facilitator/fire-inject"
```

The full facilitator dashboard (a UI over this endpoint) is Phase 8.

## Finalize + debrief (Phase 7)

**Capture-log hardening** — `finalizeSession` (`POST /api/facilitator/finalize-session`,
bearer) ends a session and materializes the high-signal **omissions** the log can only
know once the clock stops: `brief_never_opened`, `email_unopened`, `thread_ignored`
(marked `derived=true`). It then persists a trait-score snapshot (`lib/scoring`) and
broadcasts a `curtain` event to live participants. The `events` log stays append-only
(finalize only inserts).

**The debrief** — the first *read* of the spine:
- **View:** `/facilitator/debrief/<sessionId>?key=<FACILITATOR_SECRET>` — the first-move
  diagnostic ("who did each person contact first, and when"), per-participant timelines
  (acts + omissions), response latencies, and the v0.1 **hypothesis** trait scores
  (value + confidence + evidence count, clearly marked not-yet-validated).
- **JSON:** `GET /api/facilitator/debrief?sessionId=` (bearer) for exports/make.com.

Everything in the debrief is a read of Layer 1 — no new capture. The scoring pipeline
was runtime-verified (evidence-cited scores, confidence shrinkage, hypothesis gate).

## Roadmap & reserved hooks

The build map above the phases is **`docs/vision-roadmap.md`** (TLFS as a behavioral
instrument; the moat is the engine). Its discipline: *reserve the hooks now so no later
horizon needs a migration.* Reserved in-repo so far:

- **Event richness** — `events`, locked & maximal (`0005`).
- **Behavioral profile** — `behavioral_profile`, reserved empty (`0005`) — the Horizon-1
  dependency for Director-AI / twin / NPC gossip / season.
- **Casting** — seat ≠ participant, every seat Human-or-AI: `participants.cast_kind` +
  `agent_json`, nullable `token` (`0006`). Reserved, not built.
- **Consent/retention** — `consents` (`0005`), now **written** on disclaimer accept
  (§8): capture consent granted, longitudinal retention opt-in (false by default).
- **Longitudinal profile** — `behavioral_profile` (`0005`), now **populated** at
  session finalize: each session's trait scores append to the per-participant
  trajectory — the read surface Director-AI / twin / gossip / season depend on.

## Solo engine (Master Handoff §5) — schema reserved

TLFS is **one engine cast two ways** (solo = 1 human + N AI seats; team = N humans).
The team front-end (InCommand / The Signal) is built; the **solo real-time engine**
(weeks clock, pull-to-ask, AI referee ruling free-text → driver deltas, held-info
landmines, villain/hero endings) is the next front-end. Its schema (`0009`) is in
place — additive, unused by the app yet:
`scenario_meta`, `holds`, `run_drivers`, `rulings`, `run_outcome`, plus
`injects.trigger_json` (A3.1 Director-eligible triggers). Per Addendum **A3**, the
solo innovations need **no new raw capture** — the `events` log + A1 already cover
them; `0009` is authored content + versioned Layer-2 reads only.

> `0009` is not needed on a live project until the solo runtime is built — apply it
> then. Fresh installs get it via `deploy/bootstrap.sql`.

**Phase 1 (solo) done — Backlash seeded.** `scripts/seed/build_solo_seed.mjs` loads a
real-time content file (`prototype/solo/*-realtime-content.js`) and emits the seed
faithfully-by-construction. `supabase/solo_seed_backlash.sql` ports **Backlash** into
the unified model: the CEO **hot seat** + 5 advisors as **AI-castable seats**
(persona/voice/disposition in `seats.meta`), all held-info **landmines** → `holds`,
every week's timed beats (situation/feed/surprise/pulse/wire) → `injects`
(week/day/tag in `trigger_json`), and the **full content + logic functions** (as
source) in a `documents:solo_content` blob the runtime loads. Reference prototype code
is vendored under `prototype/solo/`.

**Phase 2 (solo read path) done.** `/solo/[sessionId]?t=<token>` renders a Backlash
week from the DB — driver HUD, the situation, the advisors' opening positions, the
trickled feed, and the cast rail — with realtime subscribed (`lib/solo-data.ts` +
`components/solo/SoloApp.tsx`). The seed includes a **demo solo session** cast 1
human CEO + 5 AI advisors (`cast_kind`). Disposition is a run dial (`sessions.run_config`,
`0010`), not a seat attribute. Phase 3 adds the real-time clock: 200ms tick maps seconds to in-fiction days, the feed/surprises/pulse trickle in as their day arrives (guarded disposition delays a day), the buzzer forces the call at week's end, and "need more time" buys days at a driver cost. Phase 4 adds the heart: pull-to-ask (reach out to an advisor → in-character reply via Claude, held-info landmines surface on a targeted ask matching trigger_hints, hedging under the 'guarded' disposition) and the AI referee (write your free-text call → ruling against the world model: driver deltas + narrative + private dimension/conduct scores, persisted to rulings/run_drivers/events). Deterministic fallback (crisis-engine.js) runs without a key; SOLO_MODEL defaults to claude-haiku-4-5.

**Phase 5 (solo game-film debrief) done.** `/solo/[sessionId]/debrief?t=<token>` reads a finished run off the append-only truth (`events` + `rulings` + `run_drivers`) against `documents:solo_content`: dimension scores aggregated/normalized across weekly rulings, counterfactuals for the holds never surfaced, coaching grouped by the two weakest dimensions, and the villain/hero **ending** resolved by the scenario's own authored functions (`survived`/`villainHero`/`ending`/`COACH`, reconstituted from `{__fn}` markers). `lib/solo-week.ts` resolves branched weeks (Backlash Week-4 held/caved) against the run's decided branch (`rulings.branch_key`) — wired into `loadSolo`, `soloAsk`/`soloDecide`, and the debrief so the Week-3 payoff renders and its holds enter the accounting.

**Phase 6 (casting — the "one engine" test) done.** Seat ≠ participant; every seat is Human-or-AI (`cast_kind`/`agent_json`, `0006`). The team engine now has a single message-delivery core (`lib/message-core.ts` `postSeatMessage`) that both a human's `sendMessage` and an **AI-cast seat's autonomous reply** (`lib/agent-seat.ts` `driveSeatReply`) post through — so an AI occupant's `message_sent` is structurally indistinguishable in the capture log from a human's. When a human messages a teammate seat cast as AI, that seat answers in character (persona from `agent_json`, `SOLO_MODEL`; deterministic fallback without a key) via the same threads/mirror/broadcast/event. The facilitator can cast any seat human↔AI (`castSeat`, logged as `seat_recast`) from the roster (`Cast AI` toggle + `AI` badge). This is "TLFS is one engine cast two ways" made real: the same engine runs a team of humans, a team with AI-filled seats, or (the limit) one human plus AI seats.

**Phase 9 (the cross-session Behavioral Memory Spine — the moat) done.** The spine's point is *how a person behaves under load across engagements*, but `participants` are per-session, so the missing backbone was a stable person identity. `0011` adds `subjects` (a person, get-or-create by org+email/name handle) and links `participants.subject_id` + `behavioral_profile.subject_id`, so trait trajectories now accumulate **per person across sessions**, not just within one. `lib/spine.ts` is the read/write surface: `subjectForParticipant` (identity), `appendProfile` (cross-session accumulation), `subjectPosture` (confidence-weighted mean per trait), and — the first read that feeds the engine — `resolveDispositionFromHistory`: the disposition a leader has *earned*. Sign-aligning the trust-relevant traits (`trust_vs_suspect`, `hoard_vs_share`, `status_behavior`, `continuity_vs_drop`) into one "forthcoming" score maps a punished-the-messenger history → `guarded`, a trust-earned history → `served`, no/neutral history → `request` (a v0.1 hypothesis mapping, versioned with the taxonomy). A solo run now scores itself at the final decision (`scoreSoloRun`) and appends to the CEO's profile exactly as a team session does at finalize; when the run's disposition dial is `Surprise`/`auto`, `loadSolo`/`soloAsk` resolve the real disposition from that history — *"this is not a setting; it is a consequence of how you've led before."* The solo facilitator console surfaces the earned read (sessions, resolved disposition, the postures behind it). This is the platform's compounding asset: every session makes the next one read the person more truly.

**Director-AI (Horizon 1) done.** The layer that decides *when / whether / to whom* the
authored beats fire in a live run — instead of a facilitator hand-firing each on a fixed
clock (the `injects.trigger_json` hook reserved in `0009`). `lib/director.ts`
`runDirector()` runs on a **tick**: it time-gates the not-yet-fired beats (`delay_min`
elapsed since `started_at`), then releases them — the deterministic layer that alone
replaces clock-watching, with `fireInject`'s own cancelIf still defusing no-response
nags. With a key + AI enabled, the beats carrying a free-text `cond` ("David hasn't
responded", "no escalation by T+20") are judged by Claude against a per-seat engagement
digest — fire now or hold — and **paced** so one seat isn't buried in a single tick;
any failure falls back to firing. `/api/facilitator/director` is the tick endpoint
(make.com/cron pings it; a no-op when the session's Director is off, so scripted/manual
firing stays the fallback). The team console has a Director panel: on/off + AI toggle,
Preview (dry-run) and Run-tick, with the fire/hold decisions and reasons. Enable per
session via `run_config.director`.

## Deploy

`DEPLOY.md` is the runbook. Summary: apply `supabase/migrations` + `seed.sql` to a
Supabase project (`supabase db push` + `psql -f seed.sql`), set the env vars from
`.env.example` in Vercel, deploy. Local full stack: `supabase start && supabase db
reset` (Docker). CI (`.github/workflows/ci.yml`) runs the build/type-check on push.

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

## The participant app (Phase 2 — read path)

A **Next.js (App Router) + TypeScript** app that resolves a magic-link token → seat
and renders it from the DB, then subscribes to Supabase Realtime for live updates.

```
app/
  page.tsx                         /  → marketing / closed
  s/[sessionId]/page.tsx           /s/:id?t=token → resolve token → seat (guards)
  s/[sessionId]/lobby/page.tsx     fallback seat-claim roster (no/blank token)
  globals.css                      dark "command" UI (dependency-light, no Tailwind)
components/
  Notice.tsx                       guard/closed notices
  participant/                     ParticipantApp + Header, LeftPanel, ThreadView,
                                   EmailView, CallOverlay, BriefModal, DisclaimerModal, Curtain
lib/
  data.ts                          resolveSeat() — token → seat bundle (service role)
  actions.ts                       server actions: acceptDisclaimer, logEvent (capture log)
  realtime.ts                      useParticipantChannel() — broadcast + presence
  supabase/{admin,browser}.ts      service-role (server) + anon (browser) clients
  types.ts, env.ts, ui.ts
```

**How it works**
- **Token resolution is server-side** (handoff §2A): the seat route reads `?t=token`,
  resolves it via the service-role client (RLS is default-deny for the browser), and
  renders the seat bundle — identity, brief, situation, contacts (Team/External/Internal
  with presence + unread), email, and existing threads.
- **Guards**: missing token → lobby; invalid token / `draft` / `ended` session → notice.
- **Disclaimer gate** shows once; accepting flips presence online and logs an event.
- **Realtime** (`lib/realtime.ts`): one channel per seat
  (`signal:session:<id>:seat:<seatKey>`) for presence + broadcast events
  (`message`/`email`/`call`/`situation`). Later phases' server writes broadcast onto
  this same channel, so the read path stays live without exposing privileged reads to
  the anon client.
- **Messaging is live (Phase 3)**: the composer sends (Enter to send). `sendMessage`
  (server action) finds/creates the thread, writes the message, **mirrors** it into a
  teammate's thread + **broadcasts** to their seat channel, and appends `message_sent`
  to the capture log with scoring context (`target_kind`, `target_section`, `out_group`).
  Presence is session-wide (`useSessionPresence`) so every seat sees who's online. The
  **un-sent draft** is captured as `message_draft_discarded` on abandon (spine §1).
  NPC auto-replies (scripted injects / LLM) come with Phases 5–6.
- **Email + documents are live (Phase 4)**: opening an email marks it read
  (`markEmailRead` → status/`read_at` + `email_read` event). If it carries a document
  (e.g. the LOI draft → David), the participant can **Approve / Return (with reason) /
  Edit** it — each writes a capture-log event (`doc_approved`/`doc_returned`/`doc_edited`,
  channel `doc`) and the terminal decision is denormalized onto the email (`0007`).
- **Voice is live (Phase 6)**: the call overlay drives a real two-way loop — place
  (outbound) or Accept/Decline (inbound), play the NPC's opener, then **Web Speech STT
  or typed input → `npc-reply` → `tts` → playback**, looping. `npc-reply`
  (`/api/voice/npc-reply`) builds the reply from `contacts.persona` + recent `call_turns`
  via Claude (default `claude-opus-4-8`, `VOICE_MODEL`-overridable); `tts`
  (`/api/voice/tts`) proxies ElevenLabs using `contacts.voice_id` (keys server-side).
  Every utterance is recorded as a `call_turn` row + event, and `call_placed`/
  `call_accepted`/`call_declined`/`call_ended` land in the spine. The typed fallback is
  always present.

The seed materializes each seat's T=0 messages into the demo session, so opening
`/s/<demo-session-id>?t=demo-david-REPLACE` shows a populated seat.

### Run the app

```bash
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY + SUPABASE_* 
npm install
npm run dev                  # http://localhost:3000
```

Needs a Supabase project (or `supabase start`) with the migrations + seed applied.
Get a demo link's token + session id from the `participants` / `sessions` tables.
Verified: `npm run build` compiles + type-checks clean; migrations + seed apply on
PostgreSQL 16.

## Running Supabase locally

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
