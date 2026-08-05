import 'server-only';

// If-then cue validator — guards SHAPE, where grounding guards FACTS. A cue can cite real
// evidence and still be a horoscope. These eight rules separate an implementation intention
// from a fortune cookie (Screen-13 handoff). The test that matters: would this be true of any
// executive alive? Then it's decoration, and it fails.

const L = (s: string) => s.toLowerCase();

// Vague interior states and trait language — the horoscope vocabulary.
const VAGUE = [
  'overwhelmed', 'stressed', 'burned out', 'burnt out', 'anxious', 'frustrated', 'uncomfortable',
  'avoidant', 'defensive', 'insecure', 'triggered', 'mindset', 'energy', 'authentic', 'deep down',
  'your true self', 'perfectionist', 'imposter', 'misaligned', 'disconnected', 'out of alignment',
  'in general', 'tend to', 'often', 'sometimes', 'usually', 'typically', 'from time to time',
];

// Self-observable anchors: countable, artifact-bound, or a physical act.
const ANCHORS = [
  'third', 'second', 'twice', 'three times', 'a third time', 'first',
  'message', 'email', 'note', 'list', 'calendar', 'meeting', 'thread', 'document', 'doc', 'slide', 'ticket', 'report', 'update', 'draft',
  'hear myself', 'catch myself', 'notice', 'write', 'writing', 'read', 're-read', 'reread', 'open', 'send', 'say', 'saying', 'walk', 'sit', 'type', 'click', 'close', 'leave', 'end', 'ends',
];

const HEDGE = ['try to', 'consider', 'maybe', 'perhaps', 'think about', 'attempt to', 'make an effort', 'remember to', 'be more', 'be less'];
const TRAIT = ['because you are', "because you're", 'you are a', "you're a", 'your personality', 'your type', 'people like you'];

const has = (text: string, list: string[]) => {
  const t = L(text);
  return list.filter((w) => t.includes(w));
};

export interface CueRule {
  id: string;
  label: string;
  pass: boolean;
  note: string;
}
export interface CueResult {
  ok: boolean;
  rules: CueRule[];
  failed: CueRule[];
  text: string;
}

export function validateCue(cue: string, action: string, anchorRef: string): CueResult {
  const full = `When ${cue} — then ${action}`;
  const rules: CueRule[] = [];
  const add = (id: string, label: string, pass: boolean, note: string) => rules.push({ id, label, pass, note: pass ? '' : note });

  // R1 structure
  add('structure', 'When / then structure', !!cue && !!action && !/\bthen\b/i.test(cue),
    'Cue and action must be separate; the cue itself must not contain "then".');

  // R2 self-observable anchor in the cue
  const anchors = has(cue, ANCHORS);
  add('observable', 'Cue is self-observable', anchors.length > 0,
    'The cue must be noticeable from the inside in the moment — a count, an artifact, or a physical act. "When I am being avoidant" is a judgement, not a cue.');

  // R3 no vague interior state unless bound to a concrete anchor
  const vagueCue = has(cue, VAGUE);
  add('concrete', 'No vague or trait language in the cue', vagueCue.length === 0 || anchors.length > 0,
    vagueCue.length ? `Vague: ${vagueCue.join(', ')} — bind it to something countable or drop it.` : '');

  // R4 single concrete action
  const multi = /\band then\b|;|\balso\b|\.\s+\S/i.test(action);
  add('single', 'One action, not a programme', !multi && action.split(/\s+/).length <= 20,
    'The action must be one thing, doable in under a minute, twenty words or fewer.');

  // R5 no hedging in the action
  const hedges = has(action, HEDGE);
  add('definite', 'Action is definite', hedges.length === 0,
    hedges.length ? `Hedged: ${hedges.join(', ')} — "try to be more open" is not an action.` : '');

  // R6 no trait attribution anywhere
  const traits = has(full, TRAIT);
  add('notrait', 'No trait attribution', traits.length === 0,
    traits.length ? `Trait language: ${traits.join(', ')} — cue the behaviour, never explain the person.` : '');

  // R7 anchored to a logged moment
  add('anchored', 'Anchored to a logged moment', !!anchorRef && anchorRef.trim().length > 8,
    'Every cue must name the specific logged moment it comes from, or it is generic advice.');

  // R8 length
  add('length', 'Short enough to recall under pressure', full.split(/\s+/).length <= 40,
    'Forty words maximum — a cue you cannot remember in the moment is not a cue.');

  const failed = rules.filter((r) => !r.pass);
  return { ok: failed.length === 0, rules, failed, text: full };
}

export function rejectionNote(v: CueResult): string {
  return (
    `CUE VALIDATOR REJECTED THIS. Failed rules:\n` +
    v.failed.map((r) => `- ${r.label}: ${r.note}`).join('\n') +
    `\n\nRewrite it. The cue must be something noticeable from the inside in the moment (a count, an artifact, a physical act), the action must be one definite thing under twenty words, and you must name the logged moment it comes from. Do not explain the person; cue the behaviour.`
  );
}
