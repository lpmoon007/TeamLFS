# Build Addendum — implementation status

Tracks the `Build Addendum` requirements as they land in the code.

## A1 — Communication-map capture (raw, non-retrofittable) — ✅ locked

| Req | Where |
|---|---|
| **A1.1 Directed sender → recipient** on every message | `message_sent` events carry `seat_id` (sender) + `target` (recipient); payload also has explicit `recipients[]` / `addressed[]` (group-addressing forward-compat) — `lib/actions.ts` `sendMessage`. |
| **A1.2 Per-seat inject resolution** (delivered/opened/addressed/ignored) | `inject_resolution` table (`migration 0008`). `fireInject` writes `delivered`; `finalizeSession` reconciles to opened/addressed/ignored from the event log — `lib/inject.ts`, `lib/finalize.ts`. |
| **A1.3 Cross-seat, session-scoped queryability** | `events`/`inject_resolution` indexed by `session_id`; the debrief reads across all seats at once — `lib/debrief.ts`. |
| **A1.4 "Raised then overridden" is DERIVED** | Reserved as a versioned hypothesis trait (`raised_then_overridden`), evidence extractor stubbed (no false signal); computed later — `lib/scoring/registry.ts`, `migration 0008`. |

## A2 — The Debrief Suite is ONE linked system — ✅ built (v1)

One dataset (`buildDebrief` in `lib/debrief.ts`), three renderers over it:

| Altitude | Route | Notes |
|---|---|---|
| **Team debrief** (discussion) | `/facilitator/debrief/[sessionId]` | Communication map (`CommsMap`) with blue directed edges + flag-coloured nodes, "what the team knew but didn't surface" chips (from `inject_resolution` ignored), per-person cards → drill to film. |
| **Game-film** (coaching) | `/facilitator/debrief/[sessionId]/[seatId]` | One participant's footage (acts + omissions/amber), LDOL disciplines + 2Q (versioned lens over the trait layer), trait scores. Breadcrumb `Team ▸ Person`; ‹/› cross-participant paging; Back to team. |
| **One Wall** (room) | `/facilitator/debrief/[sessionId]/wall` | Big minimal projection with the facilitator **reveal** — show what happened (blue), then reveal what didn't (amber "never happened" edges). |

- **One dataset, three renderers** — all read `buildDebrief`; no per-screen duplication.
- **LDOL lens is swappable/versioned** — surfaced as "Lens: LDOL v1"; the disciplines/2Q/flags are a derived view over the trait layer, never in capture.
- **Severity flags are derived, versioned** — `flag ∈ good|watch|warn` computed in `lib/debrief.ts` (v1 heuristic), not raw.
- **Facilitator-mode** — gated by the facilitator cookie or `?key=`; the One Wall reveal is facilitator-only.

### Known follow-ups (polish, not blocking)
- The shared-element avatar **morph** transition (team→film) is approximated with a
  persistent breadcrumb + cross-participant paging; the animated morph (View
  Transitions API) is a later polish.
- Amber "never happened" edges use a v1 heuristic (unaddressed inject + never looped
  in the lead). Richer "critical conversation" detection is derived/versioned work.
- Real facilitator identity (Supabase Auth + role) replaces the cookie-secret gate.
