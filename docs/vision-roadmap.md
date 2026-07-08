# TLFS — Vision & Roadmap (build map)

The catalog that sits above the build docs. Reads with `docs/behavioral-spine.md`
and the production handoff. This copy maps each item to **where the hook lives in this
repo**, so the near-term build stays honest while the architecture never forecloses
the big moves.

## Thesis

TLFS is **a behavioral instrument with an intensity menu**, riding one persistent
**behavioral-memory spine**. The moat is the **engine** (decided); LDOL is a swappable
client-facing lens. Every idea must *provoke* behavior more sharply, *capture* it more
richly, or *reflect* it more undeniably — else it's spectacle, cut it.

## The discipline

> Horizon 0 is the only thing that blocks a first real session. Everything else is
> leverage — **reserve the hooks (profile, casting, event richness) now so no later
> horizon needs a migration**; build them in order of value (Director-AI + debrief first).

### Reserve-now hooks — status in this repo

| Hook | Why it can't be retrofitted | Where it's reserved | Status |
|---|---|---|---|
| **Event richness** (Layer 1) | Capture is once-only; un-captured = gone | `events` (`0005`, LOCKED, maximal) | ✅ done |
| **Behavioral profile** | Horizon-1 reads (Director-AI/twin/gossip/season) all depend on it | `behavioral_profile` (`0005`, reserved empty) | ✅ done |
| **Casting** (seat ≠ participant; every seat Human-or-AI) | Occupancy model must express AI seats | `participants.cast_kind` + `agent_json`, nullable `token` (`0006`) | ✅ reserved |
| **Consent/retention** | Legitimacy anchor for persistent profiles | `consents` (`0005`) | ✅ done |

Nothing else is reserved yet — by design. Horizons 2/3/Menu are **designed after** their
predecessor lands (per the doc), so no speculative tables now.

## Horizons

| Horizon | Theme | Status | Notes |
|---|---|---|---|
| **0** | Unified engine + casting + spine + 1 scenario + minimal LDOL | **Building now** | Schema, spine, seed, participant read path done; messaging/email/inject/voice next (handoff Phases 3–6). Casting hook reserved. |
| **1** | Director-AI · behavioral twin · NPC gossip · game-film debrief | Reserve profile now; build after core | **All reads of `behavioral_profile`.** Founder-committed 100%. Director-AI + debrief first (highest value). |
| **2** | 30-day · season · witting↔unwitting dial · ambiguity season · cross-cohort | Design after Horizon 1 | Format wrappers around the same engine (config + orchestration). Duration, not realism, defeats the mask. |
| **3** | Archetype library · handoff/relay archetype · AI-assisted authoring · dynamics registry | After a 2nd scenario exists | Scenarios become data on a fixed engine. Dynamics registry already seeded (`trait_registry` v0.1). |
| **Menu** | Live actors · secret mole (asymmetry, never "saboteur") · physical artifacts · positive real-stakes leakage · environmental · biometric/affect | Premium, per-engagement | Optional dials, not core. High consent bar on unwitting/biometric. |
| **Science** | Scoring validation · inter-rater reliability · stimulus-circularity guardrails · taxonomy governance | Parallel, continuous | This *is* the defensibility. Scoring pipeline stubbed (`lib/scoring`); validation is post-core. |

## Exit criterion for Horizon 0

A real session runs, captures rich raw events, and produces a basic debrief. That's the
platform; everything after is leverage.

## When an item graduates

Idea → build means it gets its own design doc (as the spine did) and this roadmap links
to it. The dynamics registry (`trait_registry` / `lib/scoring/registry.ts`) grows by
adding trait rows — *provided the event log already captured the evidence* (which is why
Layer 1 is maximal and locked now).
