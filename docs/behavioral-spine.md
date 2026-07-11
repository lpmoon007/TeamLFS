# Behavioral Memory Spine — build notes

Implementation of `Behavioral Memory Spine — Design`. The spine is the persistent
record of how a person behaves under load. It powers the debrief and, later, the
Director-AI, behavioral twin, NPC memory, and season play — all of which are just
**reads** of this record.

> **The one-line rule:** *Lock the event schema. Version the traits. Version the lens.
> Treat scoring as the instrument, not a detail.*

This was built as part of Phase 1 (the event schema cannot be retrofitted). It landed
**after** the scenario was seeded but **before** any real session was captured — the
only events that exist are the demo fixture, so the lock is clean.

## Founder decision — the moat is the ENGINE

Defensibility lives in the **raw engine + behavioral-memory spine** (event log +
scoring function + longitudinal profile), not in LDOL. Consequences we build to:

- **Protect/invest most in the spine.** The event log's richness and the scoring
  function are the core IP. Over-capture; make scoring rigorous.
- **LDOL is a swappable, agnostic lens** — the default client-facing output, but not
  the thing under lock. Clients may bring their own framework.
- **Keep proprietary:** engine, event schema, scoring pipeline, behavioral profile.
  **Let clients swap:** the lens.

## The three layers

| Layer | Where it lives | Locked? |
|---|---|---|
| **1. Event log** — what actually happened (incl. omissions, un-sent, latency, silence) | `events` table (`0005`) | **LOCKED, append-only** |
| **2. Trait layer** — derived postures computed from Layer 1 | `trait_registry` + `trait_scores` (`0005`); `lib/scoring` | **Versioned, not locked** |
| **3. LDOL lens** — client-facing interpretation (4 disciplines, 2Q) | `lib/lens/ldol.ts` (`LENS_VERSION`, versioned view) | **Versioned, never in capture** |

Everything in Layers 2–3 is **re-computable from Layer 1**. That is the moat: traits
and LDOL *will* evolve, and every past session can be re-interpreted with zero re-run.

## What's in the repo

### Layer 1 — `events` (LOCKED)
`supabase/migrations/0005_behavioral_spine.sql` enriches `events` for maximal capture:
`seat_id`, `channel` (`message|group|email|call|doc|brief|system`), `scenario_ms`
(scenario clock), `derived` (always false here), and `ts` (server timestamp). Kept
append-only by the trigger from `0001`. `type` is open text so the high-signal
**negatives** are first-class: `message_draft_discarded`, `thread_ignored`,
`email_unopened`, `brief_never_opened`, `silence`, plus `response_latency` and
`inject_delivered` (so behavior is always paired with its stimulus — §4 circularity).

The app already writes Layer 1: `lib/actions.ts` (`acceptDisclaimer`, `logEvent`) and
the participant UI log `disclaimer_accepted`, `thread_opened`, `email_read`,
`brief_opened`, `call_placed` with channel + seat. No trait judgments in this table.

### Layer 2 — traits (VERSIONED)
- `trait_registry` — seeded with the **v0.1** dynamics (7 axes), every row
  `status = 'hypothesis'`. Canonical rubric source is `lib/scoring/registry.ts`.
- `trait_scores` — versioned by `taxonomy_version` + `scorer_version`; every score
  cites `evidence_event_ids`; a re-score writes new rows, never mutates old ones.
- `lib/scoring/` — the **scoring function** as its own module (see its README):
  `scoreSession()` reads Layer 1 only, `aiScoreSession()` is the AI-first seam,
  `isValidated()` gates hypothesis vs. sellable diagnostic.

### §7 Longitudinal profile (reserved)
`behavioral_profile` — created empty. One asset, four faces (Director-AI, twin, NPC
gossip, season), all reads of the spine.

### §8 Consent & retention
`consents` — capture/retention consent, `retention_scope`, `policy_version`,
`revoked_at` (deletion boundary). The profile is a development tool, not surveillance;
consent + de-role are the legitimacy anchor. All spine tables are RLS default-deny
(server/facilitator only).

## Circularity posture (§4)

- **Interpretive circularity — solved** by the layer split: raw behavior isn't coded
  in any trait's shape at capture time, so an independent coder can read it differently.
- **Stimulus circularity — NOT solved** by layering. Mitigations we design for: keep
  the raw log (re-code independently), and pair every act with its `inject_delivered`
  stimulus so we can later ask "did this pattern appear only where we engineered it, or
  elsewhere too?" A finding outside the designed trap is real; one only inside it is
  suspect.

## Still to do (post-core, §9)

- Validate scoring (inter-rater reliability) before any trait becomes a client claim;
  flip `trait_registry.status` to `validated` per trait only then. **Harness + human
  coding surface built** (`lib/rescore.ts`, `/facilitator/code/…`) — the measurement is
  the remaining science.
- ~~Build the LDOL lens (Layer 3) as a versioned view.~~ **Done** (`lib/lens/ldol.ts`):
  `LENS_VERSION`, a data-driven discipline/2Q mapping OVER the trait scores (not raw
  counts), wired into the team game-film + solo debrief. Swap the definition to re-frame
  every past session — the engine/log never change.
- Light up Director-AI (**done**) / twin / gossip / season as reads of
  `behavioral_profile`.
