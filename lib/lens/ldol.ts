import type { TraitScore } from '@/lib/scoring';

// LDOL lens — Layer 3 of the Behavioral Memory Spine (design doc §, roadmap Horizon 0
// "minimal LDOL"). The founder decision: the ENGINE is the moat; LDOL is the SWAPPABLE
// client-facing interpretation. So the lens lives here as a VERSIONED, data-driven view
// OVER the trait layer (Layer 2 trait_scores) — never in capture, never welded to the
// engine. A client bringing their own framework swaps LDOL_V1 for their own definition;
// nothing in the engine or the event log changes, and every past session re-renders.
//
// This replaces the old inline heuristic that read raw event counts. A lens reads the
// INSTRUMENT (the versioned, evidence-cited trait scores), not the UI's tallies.

export const LENS_VERSION = 'ldol-v1';

export type LensSignal = 'strong' | 'weak' | 'thin';

export interface TraitReadInput extends Pick<TraitScore, 'trait_key' | 'value' | 'value_num' | 'confidence' | 'evidence_event_ids'> {}

export interface LensDisciplineRead {
  name: string;
  frame: string;
  read: string;
  signal: LensSignal;
  traits: { trait_key: string; label: string; pole: string | null; confidence: number; evidence: number }[];
}
export interface LensRead {
  version: string;
  disciplines: LensDisciplineRead[];
  building: string[];
  allowing: string[];
  note: string;
}

// Per-trait lens metadata: the CONSTRUCTIVE pole ("building"), the COST pole ("allowing"),
// a short label, and a verb-phrase gloss per stored pole value. This is the lens's
// interpretive content — swap it (or the whole object) to re-frame the same scores.
interface TraitLens {
  label: string;
  build: string; // the pole this lens treats as constructive
  cost: string; // the pole this lens treats as the cost
  gloss: Record<string, string>; // pole value → verb phrase
}

const TRAIT_LENS: Record<string, TraitLens> = {
  verify_vs_act_on_belief: {
    label: 'Verification',
    build: 'verify',
    cost: 'act_on_belief',
    gloss: { verify: 'checked before committing', act_on_belief: 'acted on belief without verifying', mixed: 'sometimes verified, sometimes assumed' },
  },
  frame_taker_vs_questioner: {
    label: 'Framing',
    build: 'questioner',
    cost: 'frame_taker',
    gloss: { questioner: 'interrogated the premise', frame_taker: 'took the brief as given', mixed: 'mostly accepted the frame' },
  },
  compete_vs_collaborate: {
    label: 'Orientation',
    build: 'collaborate',
    cost: 'compete',
    gloss: { collaborate: 'built shared action', compete: 'assumed rivalry unprompted', mixed: 'mixed competitive/cooperative signals' },
  },
  continuity_vs_drop: {
    label: 'Continuity',
    build: 'continuity',
    cost: 'drop',
    gloss: { continuity: 'closed the loops it opened', drop: 'left handoffs open', mixed: 'closed some loops, dropped others' },
  },
  status_behavior: {
    label: 'Status conduct',
    build: 'attentive',
    cost: 'dismissive',
    gloss: { attentive: 'attended to lower-status voices', dismissive: 'dismissed out-group demands', mixed: 'uneven attention across status' },
  },
  hoard_vs_share: {
    label: 'Disclosure',
    build: 'share',
    cost: 'hoard',
    gloss: { share: 'surfaced what it knew', hoard: 'held information close', mixed: 'shared selectively' },
  },
  trust_vs_suspect: {
    label: 'Trust',
    build: 'trust',
    cost: 'suspect',
    gloss: { trust: 'extended trust under stress', suspect: 'looked for fault before facts', mixed: 'guarded but not accusatory' },
  },
  raised_then_overridden: {
    label: 'Voice',
    build: 'engaged',
    cost: 'overridden',
    gloss: { engaged: 'engaged the dissent it heard', overridden: 'overrode a raised concern', mixed: 'partially engaged the pushback' },
  },
};

// The LDOL disciplines — each a grouping of trait dynamics. Data-driven: the mapping IS
// the lens. `Learning` reads cross-session posture (Phase 9) when it exists.
interface Discipline {
  name: string;
  frame: string;
  traitKeys: string[];
  crossSession?: boolean;
}
export interface LensDefinition {
  version: string;
  disciplines: Discipline[];
}

export const LDOL_V1: LensDefinition = {
  version: LENS_VERSION,
  disciplines: [
    { name: 'Decision', frame: 'How they committed under uncertainty', traitKeys: ['verify_vs_act_on_belief', 'frame_taker_vs_questioner'] },
    { name: 'Rhythm', frame: 'How they worked the room', traitKeys: ['compete_vs_collaborate', 'continuity_vs_drop'] },
    { name: 'Standard', frame: 'How they treated people and the truth', traitKeys: ['status_behavior', 'hoard_vs_share', 'trust_vs_suspect', 'raised_then_overridden'] },
    { name: 'Learning', frame: 'How they change across sessions', traitKeys: [], crossSession: true },
  ],
};

const THRESH = 0.15; // minimum confidence for a read to count toward building/allowing

const signalOf = (maxConf: number): LensSignal => (maxConf >= 0.5 ? 'strong' : maxConf > 0 ? 'weak' : 'thin');

export interface LensInput {
  traits: TraitReadInput[];
  omissions?: { count: number; names?: string[] };
  // cross-session posture for the Learning discipline (Phase 9). null on first session.
  history?: { sessions: number; trend?: { trait_key: string; pole: string } | null } | null;
}

/** Apply a lens to a participant's trait scores → the client-facing read. Pure. */
export function applyLens(input: LensInput, def: LensDefinition = LDOL_V1): LensRead {
  const byKey = new Map(input.traits.map((t) => [t.trait_key, t]));
  const building: string[] = [];
  const allowing: string[] = [];

  const disciplines: LensDisciplineRead[] = def.disciplines.map((d) => {
    if (d.crossSession) {
      const h = input.history;
      const read =
        !h || h.sessions <= 1
          ? 'One session on record — no trajectory yet. The Learning read appears once this person has a prior run in the spine.'
          : h.trend
            ? `Across ${h.sessions} sessions, trending toward ${prettyPole(h.trend.trait_key, h.trend.pole)}.`
            : `Across ${h.sessions} sessions, no consistent drift yet.`;
      return { name: d.name, frame: d.frame, read, signal: (h && h.sessions > 1 ? 'weak' : 'thin') as LensSignal, traits: [] };
    }

    const reads = d.traitKeys
      .map((k) => {
        const t = byKey.get(k);
        const meta = TRAIT_LENS[k];
        if (!t || !meta) return null;
        return { trait_key: k, label: meta.label, pole: t.value ?? null, value_num: t.value_num, confidence: t.confidence, evidence: (t.evidence_event_ids ?? []).length, meta };
      })
      .filter((r): r is NonNullable<typeof r> => !!r);

    const maxConf = reads.reduce((m, r) => Math.max(m, r.confidence), 0);
    const confident = reads.filter((r) => r.confidence >= THRESH && r.pole);

    // compose the discipline read from the confident trait glosses
    const clauses = confident.map((r) => `${r.meta.gloss[r.pole!] ?? r.pole} (${Math.round(r.confidence * 100)}%)`);
    const read = clauses.length ? capitalize(clauses.join('; ')) + '.' : 'Not enough evidence this session to read.';

    // feed the 2Q
    for (const r of confident) {
      if (r.pole === r.meta.build) building.push(r.meta.gloss[r.pole]!);
      else if (r.pole === r.meta.cost) allowing.push(r.meta.gloss[r.pole]!);
    }

    return {
      name: d.name,
      frame: d.frame,
      read,
      signal: signalOf(maxConf),
      traits: reads.map((r) => ({ trait_key: r.trait_key, label: r.label, pole: r.pole, confidence: r.confidence, evidence: r.evidence })),
    };
  });

  if (input.omissions && input.omissions.count > 0) {
    const who = input.omissions.names && input.omissions.names.length ? ` (${input.omissions.names.join(', ')})` : '';
    allowing.push(`${input.omissions.count} thing${input.omissions.count > 1 ? 's' : ''} left unaddressed${who}`);
  }

  return {
    version: def.version,
    disciplines,
    building: dedupe(building),
    allowing: dedupe(allowing),
    note: 'LDOL is a versioned lens over the trait layer — a reading, not a verdict. The traits it reads are v0.1 hypotheses; swap the lens without touching the engine or the log.',
  };
}

function prettyPole(traitKey: string, pole: string): string {
  const meta = TRAIT_LENS[traitKey];
  return meta?.gloss[pole] ?? `${traitKey}:${pole}`;
}
const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const dedupe = (a: string[]) => [...new Set(a)];
