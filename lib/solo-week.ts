import 'server-only';

// Branch resolution for the solo engine. Some weeks fork on a prior decision — e.g.
// Backlash Week 4 ("The bill comes due") branches on the Week-3 Halloway ruling into
// `held` vs `caved`, each with its own situation / advocacy / feed / holds / surprises /
// pulse / wire (crisis-engine.js: the engine swaps in the branch at startWeek). A
// branched week carries only { n, title, seconds, branches:{…}, final } at the top
// level; the playable content lives under the chosen branch.
//
// `branchKey` is the classifier the referee stored on the deciding week's ruling
// (rulings.branch_key). Resolving folds the chosen branch onto the base week so the
// rest of the engine reads one flat week shape, branched or not. Falls back to the
// first branch when the key is missing/unknown (a player can't reach a branched week
// without having decided the prior one, but this keeps the read total).

export function resolveWeek(content: any, weekIdx: number, branchKey: string | null | undefined): any {
  const w = (content?.WEEKS ?? [])[weekIdx] ?? {};
  if (!w.branches || typeof w.branches !== 'object') return w;
  const keys = Object.keys(w.branches);
  const chosen = (branchKey && w.branches[branchKey]) || (keys.length ? w.branches[keys[0]] : {}) || {};
  const merged = { ...w, ...chosen };
  delete merged.branches;
  return merged;
}

// Every playable week, branches resolved for this run — for whole-run accounting
// (debrief holds/counterfactuals). Weeks are resolved in order against the run's branch.
export function resolveAllWeeks(content: any, branchKey: string | null | undefined): any[] {
  return (content?.WEEKS ?? []).map((_w: any, idx: number) => resolveWeek(content, idx, branchKey));
}
