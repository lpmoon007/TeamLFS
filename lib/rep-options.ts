// 30-Day Rep option generation. Derived from the leader's gap — the ONE rule that decides
// whether this works: the rep must target the half of the behaviour they have NOT already
// solved. Breadth at ceiling with information-seeking at 40 means a "reach out to people" rep
// trains the half they're already excellent at — 30 faithful days, no movement, and they
// conclude the system doesn't work. So options are keyed to the WEAKEST marker, never a ceiling.
//
// Each option is validated by shape (spec §2a): one sentence, starts "Each day,", doable on a
// bad day, answerable yes/no at 4 p.m., names a behaviour rather than a feeling. Deterministic
// (not model-generated) so the shape guarantees hold every time.

export interface RepOption {
  id: string;
  marker: string; // the six-marker key it trains
  text: string; // the rep itself — starts "Each day,"
  targets: string; // one line: what it trains (the annotation)
  difficulty: 'Starter' | 'Stretch' | 'Hard';
}

export const MARKER_LABEL: Record<string, string> = {
  A1: 'Information-seeking', A2: 'Decision calibration', A3: 'Consultation breadth',
  A4: 'Truth-seeking over comfort', A5: 'Intent–action integrity', A6: 'Composure under escalation',
};

// three reps per marker, easiest → hardest. All start "Each day," and are yes/no answerable at 4pm.
const LIB: Record<string, { text: string; targets: string; difficulty: RepOption['difficulty'] }[]> = {
  A1: [
    { text: 'Each day, before I act on the first answer I get, ask one more question I don’t yet know the answer to.', targets: 'The second question — the one you skip when the first answer is good enough.', difficulty: 'Starter' },
    { text: 'Each day, in the meeting where I’d normally decide, name out loud the one thing I still don’t know before I move.', targets: 'Making the gap in your information visible instead of deciding past it.', difficulty: 'Stretch' },
    { text: 'Each day, find the person most likely to disagree with my read and ask them what I’m missing.', targets: 'Actively seeking the disconfirming view, not just more of the confirming one.', difficulty: 'Hard' },
  ],
  A2: [
    { text: 'Each day, before one decision, say what evidence I actually have and size the move to it — no bigger.', targets: 'Matching the size of the move to the evidence in hand.', difficulty: 'Starter' },
    { text: 'Each day, on one call, write the smallest reversible version of the decision and take that instead.', targets: 'Buying information with a small, reversible step before the big commitment.', difficulty: 'Stretch' },
    { text: 'Each day, name one decision I’m making on conviction rather than evidence, and hold it until I have more.', targets: 'Catching the move that runs ahead of what you actually know.', difficulty: 'Hard' },
  ],
  A3: [
    { text: 'Each day, ask one person outside my usual circle what they know that I don’t.', targets: 'Widening past the same three voices you always reach.', difficulty: 'Starter' },
    { text: 'Each day, before deciding, list who actually holds the facts and check I’ve reached them — not just the loudest voice.', targets: 'Reaching the person who holds something material, not the one who speaks first.', difficulty: 'Stretch' },
    { text: 'Each day, seek out the quietest person in the room and ask for their read first.', targets: 'Pulling the information that never volunteers itself.', difficulty: 'Hard' },
  ],
  A4: [
    { text: 'Each day, say one true thing I’d normally soften, to the person it’s about.', targets: 'Saying the hard thing to the person it lands on, not around them.', difficulty: 'Starter' },
    { text: 'Each day, give the piece of feedback I’ve been holding, in person, the same day I notice it.', targets: 'Closing the gap between noticing and saying.', difficulty: 'Stretch' },
    { text: 'Each day, in the conversation I’d avoid, lead with the hard part instead of burying it.', targets: 'Putting the truth first, before the cushioning.', difficulty: 'Hard' },
  ],
  A5: [
    { text: 'Each day, write down the one thing I said I’d do, and check tonight whether I did it.', targets: 'The gap between what you said you’d do and what you did.', difficulty: 'Starter' },
    { text: 'Each day, when I commit to something out loud, log it — and close the loop before I sleep.', targets: 'Making every stated intention a closed loop, not an open one.', difficulty: 'Stretch' },
    { text: 'Each day, pick the promise I’m most likely to let slide, and do that one first.', targets: 'Attacking the commitment your record says you drop.', difficulty: 'Hard' },
  ],
  A6: [
    { text: 'Each day, in the most pressured moment, pause once before I respond.', targets: 'Holding judgement steady as the situation degrades.', difficulty: 'Starter' },
    { text: 'Each day, when I feel the urge to react fast, name the pressure out loud before I decide.', targets: 'Making the pressure visible so it stops driving the call.', difficulty: 'Stretch' },
    { text: 'Each day, in the hardest conversation, slow my first response by ten seconds and ask a question instead.', targets: 'Replacing the fast reaction with a slower, information-seeking one.', difficulty: 'Hard' },
  ],
};

/** Three rep options for a target marker. Falls back to information-seeking (the most common
 *  real gap) if the marker is unknown — never returns the empty set. */
export function repOptionsFor(marker: string | null | undefined): RepOption[] {
  const key = marker && LIB[marker] ? marker : 'A1';
  return LIB[key].map((o, i) => ({ id: `${key}-${i}`, marker: key, ...o }));
}
