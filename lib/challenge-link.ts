import { CHALLENGE_URL } from '@/lib/env';

// Hand-off into Be Legendary's "Your 30-Day Challenge" (challenge.belegendary.org).
// The challenge app reads three query params on load:
//   rep  — the pre-filled commitment (it pre-selects it and jumps to step 2)
//   src  — the channel that sent them (we are 'lfs')
//   ref  — an opaque id it stores and round-trips back to us on completion
// Contract: ?rep=<commitment>&src=lfs&ref=<opaque id>#signup
export function buildChallengeLink(opts: { commitment: string; ref: string }): string {
  const params = new URLSearchParams({
    rep: opts.commitment,
    src: 'lfs',
    ref: opts.ref,
  });
  // URLSearchParams encodes spaces as '+', which the challenge form decodes back
  // to spaces; the '#signup' fragment scrolls it to the enrollment form.
  return `${CHALLENGE_URL}/?${params.toString()}#signup`;
}

// A default 30-day commitment derived from the participant's weakest coaching
// read — "the part worth taking into the next crisis." The challenge form shows
// this pre-filled; the participant can go back a step and reword it.
export function commitmentFromWeakestRead(label: string | undefined): string {
  const focus = (label ?? '').trim().toLowerCase();
  return focus
    ? `Each day, I will practice ${focus} — the one read from my crisis I most need to strengthen.`
    : 'Each day, I will practice one deliberate leadership rep — the read I most need to strengthen.';
}
