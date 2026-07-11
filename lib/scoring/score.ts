// The scoring function (§3) — turns a Layer-1 event log into versioned trait scores.
//
// Contract that must never break:
//   * Reads ONLY Layer-1 events (re-scorability across the whole corpus).
//   * Every score cites its evidence_event_ids (auditability).
//   * Tags every score with taxonomy_version + scorer_version (nothing overwrites).
//   * A hypothesis trait is never presented as a validated diagnostic.
//
// This is the AI-FIRST seam. The v0.1 implementation uses the rubric's deterministic
// evidence extractor + a transparent confidence model. The production coder will hand
// the cited evidence + rubric to Claude and store coder='ai' with the model's
// confidence — same output shape, so callers don't change.

import { getRubrics } from './registry';
import type { ScoreOptions, SpineEvent, TraitRubric, TraitScore } from './types';

/** Bump when the rubric set, confidence model, or evidence extraction changes. */
export const SCORER_VERSION = 'v0.1.0-heuristic';

/** Shrinkage constant: with little evidence, confidence stays low regardless of skew. */
const CONFIDENCE_K = 3;

/**
 * Score one participant's session from the raw event log. Synchronous + pure:
 * deterministic given the same events + rubric version.
 */
export function scoreSession(
  events: SpineEvent[],
  ctx: { participantId: string; sessionId: string },
  opts: ScoreOptions = {},
): TraitScore[] {
  const rubrics = getRubrics(opts.taxonomyVersion).filter(
    (r) => !opts.traitKeys || opts.traitKeys.includes(r.trait_key),
  );
  // Only this participant's events feed their scores.
  const mine = events.filter((e) => e.participant_id === ctx.participantId);
  return rubrics.map((r) => scoreOne(r, mine, ctx));
}

function scoreOne(
  rubric: TraitRubric,
  events: SpineEvent[],
  ctx: { participantId: string; sessionId: string },
): TraitScore {
  const { signalEventIds, counterEventIds } = rubric.evidence(events);
  const s = signalEventIds.length;
  const c = counterEventIds.length;
  const total = s + c;

  // Axis position in [-1, +1]: +1 = fully the positive pole.
  const valueNum = total === 0 ? null : (s - c) / total;
  // Confidence grows with evidence volume, shrunk toward 0 when sparse.
  const confidence = total === 0 ? 0 : Math.min(1, total / (total + CONFIDENCE_K));

  let value: string | null = null;
  if (valueNum !== null) {
    value = valueNum > 0.2 ? rubric.poles.positive : valueNum < -0.2 ? rubric.poles.negative : rubric.poles.neutral;
  }

  return {
    participant_id: ctx.participantId,
    session_id: ctx.sessionId,
    taxonomy_version: rubric.taxonomy_version,
    scorer_version: SCORER_VERSION,
    trait_key: rubric.trait_key,
    value,
    value_num: valueNum,
    confidence,
    evidence_event_ids: [...signalEventIds, ...counterEventIds],
    coder: 'ai',
  };
}

/** DB insert rows for `trait_scores` (server persists; scorer stays pure). */
export function toTraitScoreRows(scores: TraitScore[]) {
  return scores.map((s) => ({
    participant_id: s.participant_id,
    session_id: s.session_id,
    taxonomy_version: s.taxonomy_version,
    scorer_version: s.scorer_version,
    trait_key: s.trait_key,
    value: s.value,
    value_num: s.value_num,
    confidence: s.confidence,
    evidence_event_ids: s.evidence_event_ids,
    coder: s.coder,
  }));
}
