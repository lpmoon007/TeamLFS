// Behavioral scoring pipeline (Behavioral Memory Spine §3).
//
// The instrument, not a detail. Reads Layer 1 only; writes versioned Layer 2.
// See lib/scoring/README.md for the design and the validated-vs-hypothesis line.

export * from './types';
export { REGISTRY, TAXONOMY_VERSION, getRubrics, getRubric } from './registry';
export { SCORER_VERSION, scoreSession, aiScoreSession, toTraitScoreRows } from './score';

import { getRubric } from './registry';
import type { TraitStatus } from './types';

/** Is this trait a validated diagnostic (sellable), or still a hypothesis? (§3) */
export function traitStatus(traitKey: string, taxonomyVersion?: string): TraitStatus | null {
  return getRubric(traitKey, taxonomyVersion)?.status ?? null;
}

export function isValidated(traitKey: string, taxonomyVersion?: string): boolean {
  return traitStatus(traitKey, taxonomyVersion) === 'validated';
}
