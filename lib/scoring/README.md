# Scoring pipeline (`lib/scoring`)

The **load-bearing wall** of the product (Behavioral Memory Spine §3). A schema with
no validated scoring is a filing cabinet, not an instrument — so this is built as its
own module from day one, versioned, auditable, and re-runnable.

## The contract (do not break)

1. **Reads Layer 1 only.** `scoreSession()` takes raw `events` and nothing else, so
   the entire historical corpus can be re-scored when a rubric improves — no re-run.
2. **Every score cites evidence.** `evidence_event_ids` traces each claim back to the
   exact raw acts. This is what survives scrutiny under premium pricing.
3. **Everything above Layer 1 is versioned.** Each score carries `taxonomy_version`
   (the rubric set) + `scorer_version` (this module's version). A re-score writes new
   rows; it never mutates or deletes prior ones.
4. **Hypothesis ≠ diagnostic.** A trait is a research hypothesis until its
   `status` flips to `validated` (after inter-rater reliability is measured). Use
   `isValidated(traitKey)` before letting a score drive a client-facing claim.

## Files

| File | Role |
|---|---|
| `types.ts` | `SpineEvent`, `TraitRubric`, `TraitScore`, `Evidence`. |
| `registry.ts` | **v0.1 dynamics registry** (hypothesis). Each rubric's `evidence()` is a pure fn over events → cited signal/counter events. Canonical source that seeds `trait_registry`. |
| `score.ts` | `scoreSession()` (deterministic v0.1 base) + `SCORER_VERSION`. Pure, free, no network. Confidence shrinks toward 0 when evidence is sparse. |
| `ai.ts` | **The AI coder** — `aiScoreSession()` (the production scorer) + `AI_SCORER_VERSION`. Reads the participant's actual Layer-1 log (bodies + omissions), judges each rubric like a trained human coder, and cites the events that justify it. Computes the deterministic base first and overlays the model's per-trait judgment; any failure (no key, model/parse error) leaves the heuristic base standing. `SCORER_MODEL` (default Sonnet 5) is tunable. |
| `index.ts` | Public surface + `isValidated()`. |

## v0.1 status: hypothesis

The 7 starter axes came from field anecdotes and are **v0.1, expected to change**.
The heuristics in `registry.ts` are deliberately simple placeholders — their purpose
is to make the pipeline *real* (versioning + citations + re-scorability), not to be
accurate yet. They read explicit `payload_json` flags the capture layer should record
(e.g. `discloses_private`, `tone`, `out_group`), which doubles as a spec for what to
**over-capture now** so scoring can improve without a re-run. A missing flag yields no
evidence — never a wrong-but-confident score.

## What's next (post-core, per §9)

- ~~Replace the heuristic coder with the AI coder behind `aiScoreSession()`.~~ **Done**
  (`ai.ts`): Claude reads the participant's log + versioned rubric → per-trait score +
  confidence + cited evidence, with the deterministic scorer as the always-on fallback.
  Rows are tagged `v0.1.0-ai` vs `v0.1.0-heuristic` so the two coders never mix silently.
- Measure **inter-rater reliability** (AI vs human) per trait before any trait becomes
  a product claim; flip `status` to `validated` only then. (The instrument is wired; the
  *validation* is the remaining science.)
- Build the LDOL lens (Layer 3) as a versioned view that reads these scores + events.

## Usage sketch

```ts
import { aiScoreSession, toTraitScoreRows } from '@/lib/scoring';

const scores = await aiScoreSession(events, { participantId, sessionId });
await db.from('trait_scores').insert(toTraitScoreRows(scores)); // server-side
```

## Re-score harness (`lib/rescore.ts`)

Proves the spine's core promise — *every past session is re-interpretable from
Layer 1 with zero re-run* — and produces the AI-vs-heuristic comparison the
reliability measurement needs. Re-reads a session's LOCKED event log, runs both
coders, and reports per-trait pole agreement + mean |Δ value_num|. The compare is
generic (coder A vs coder B), so the same harness diffs AI vs a **human** coder
later — the human's scores are just another `TraitScore[]` set.

```bash
# dry-run report (no writes): where do the AI coder and the heuristic agree?
curl -s -X POST "$BASE/api/facilitator/rescore" \
  -H "Authorization: Bearer $FACILITATOR_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"<uuid>"}' | jq '.agreement'

# persist the fresh AI snapshot (versioned — never clobbers; a re-score = new rows)
#   ...-d '{"sessionId":"<uuid>","persist":true}'
```

`aiVerdicts: 0` in the report means the AI coder didn't run (no `ANTHROPIC_API_KEY`)
and every trait fell back to the heuristic — the diff is then trivially self-agreeing.
