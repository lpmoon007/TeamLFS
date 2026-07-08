// The dynamics registry — v0.1 (HYPOTHESIS, not scripture).
//
// This is the canonical, versioned rubric set that seeds `trait_registry`. Each
// rubric's `evidence()` is a PURE function over Layer-1 events that cites the exact
// events supporting / opposing the trait's positive pole. The heuristics below are
// deliberately simple placeholders: their job is to make the pipeline real
// (versioning + citations + re-scorability), NOT to be a validated instrument. A
// trait is only a product claim once its status flips to 'validated' after
// inter-rater reliability is measured (§3.3).
//
// The heuristics read explicit payload flags the capture layer SHOULD record (e.g.
// payload.discloses_private, payload.tone, payload.prompted). That is intentional:
// it documents what to over-capture now so scoring can improve later without a
// re-run. Missing flags simply yield no evidence — never a wrong-but-confident score.

import type { Evidence, SpineEvent, TraitRubric } from './types';

export const TAXONOMY_VERSION = 'v0.1';

/** Events of a given type. */
const ofType = (events: SpineEvent[], ...types: string[]) =>
  events.filter((e) => types.includes(e.type));

/** Truthy payload flag helper. */
const flag = (e: SpineEvent, key: string) => Boolean((e.payload_json as any)?.[key]);
const str = (e: SpineEvent, key: string) => String((e.payload_json as any)?.[key] ?? '');
const ids = (es: SpineEvent[]) => es.map((e) => e.id);

export const REGISTRY: TraitRubric[] = [
  {
    trait_key: 'compete_vs_collaborate',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'Assumes rivalry absent explicit permission to collaborate.',
    observable_signals: ['messages out-group seat unprompted', 'proposes joint action', 'withholds a shareable resource'],
    status: 'hypothesis',
    poles: { positive: 'compete', negative: 'collaborate', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const compete = events.filter(
        (e) => e.type === 'message_sent' && (flag(e, 'out_group') || flag(e, 'withholds_shareable')),
      );
      const collaborate = events.filter(
        (e) =>
          (e.type === 'message_sent' && (flag(e, 'proposes_joint') || e.channel === 'group')) ||
          e.type === 'doc_approved',
      );
      return { signalEventIds: ids(compete), counterEventIds: ids(collaborate) };
    },
  },
  {
    trait_key: 'trust_vs_suspect',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'Speed to blame / look for fault under stress.',
    observable_signals: ['assigns fault before facts', 'requests verification of others', 'language of suspicion'],
    status: 'hypothesis',
    poles: { positive: 'suspect', negative: 'trust', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const suspect = events.filter(
        (e) =>
          (e.type === 'message_sent' && (str(e, 'tone') === 'blame' || flag(e, 'requests_verification'))) ||
          e.type === 'doc_returned',
      );
      const trust = events.filter(
        (e) => e.type === 'doc_approved' || (e.type === 'message_sent' && str(e, 'tone') === 'supportive'),
      );
      return { signalEventIds: ids(suspect), counterEventIds: ids(trust) };
    },
  },
  {
    trait_key: 'frame_taker_vs_questioner',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'Accepts given assumptions or interrogates them.',
    observable_signals: ['acts on the brief as stated', 'questions the premise/deadline', 'reframes the ask'],
    status: 'hypothesis',
    poles: { positive: 'questioner', negative: 'frame_taker', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const questioner = events.filter(
        (e) => e.type === 'message_sent' && (flag(e, 'questions_premise') || flag(e, 'reframes')),
      );
      const frameTaker = events.filter(
        (e) => (e.type === 'message_sent' && flag(e, 'accepts_frame')) || e.type === 'doc_approved',
      );
      return { signalEventIds: ids(questioner), counterEventIds: ids(frameTaker) };
    },
  },
  {
    trait_key: 'hoard_vs_share',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'Under scarcity, hoards or shares material information/resources.',
    observable_signals: ['surfaces private info to the group', 'times disclosure late', 'keeps a back channel'],
    status: 'hypothesis',
    poles: { positive: 'hoard', negative: 'share', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const hoard = events.filter(
        (e) =>
          (e.type === 'message_draft_discarded' && flag(e, 'discloses_private')) ||
          e.type === 'silence' ||
          (e.type === 'call_placed' && flag(e, 'back_channel')),
      );
      const share = events.filter(
        (e) => e.type === 'message_sent' && flag(e, 'discloses_private'),
      );
      return { signalEventIds: ids(hoard), counterEventIds: ids(share) };
    },
  },
  {
    trait_key: 'verify_vs_act_on_belief',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'Under ambiguity / authority pressure, verifies or acts on belief.',
    observable_signals: ['seeks confirmation before committing', 'acts on an unverified claim', 'defers to authority instruction'],
    status: 'hypothesis',
    poles: { positive: 'verify', negative: 'act_on_belief', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const verify = events.filter(
        (e) =>
          (e.type === 'message_sent' && flag(e, 'seeks_confirmation')) ||
          (e.type === 'call_placed' && flag(e, 'to_verify')),
      );
      const act = events.filter(
        (e) =>
          (e.type === 'doc_approved' && flag(e, 'unverified')) ||
          (e.type === 'message_sent' && flag(e, 'acts_on_unverified')),
      );
      return { signalEventIds: ids(verify), counterEventIds: ids(act) };
    },
  },
  {
    trait_key: 'continuity_vs_drop',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'Preserves or drops handoffs (the Care Cart axis).',
    observable_signals: ['closes an open loop', 'leaves a demand unanswered at session end', 'hands off explicitly'],
    status: 'hypothesis',
    poles: { positive: 'continuity', negative: 'drop', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const continuity = events.filter(
        (e) => (e.type === 'message_sent' && flag(e, 'closes_loop')) || flag(e, 'handoff'),
      );
      const drop = ofType(events, 'thread_ignored', 'call_missed', 'silence').filter(
        (e) => flag(e, 'under_open_demand') || e.type === 'thread_ignored',
      );
      return { signalEventIds: ids(continuity), counterEventIds: ids(drop) };
    },
  },
  {
    trait_key: 'status_behavior',
    taxonomy_version: TAXONOMY_VERSION,
    definition: 'How they treat lower-status / out-group members.',
    observable_signals: ['responds to lower-status contacts', 'ignores out-group demands', 'tone shift by status'],
    status: 'hypothesis',
    poles: { positive: 'attentive', negative: 'dismissive', neutral: 'mixed' },
    evidence: (events): Evidence => {
      const attentive = events.filter(
        (e) => (e.type === 'message_sent' || e.type === 'thread_opened') && flag(e, 'lower_status_target'),
      );
      const dismissive = events.filter(
        (e) => e.type === 'thread_ignored' && flag(e, 'lower_status_target'),
      );
      return { signalEventIds: ids(attentive), counterEventIds: ids(dismissive) };
    },
  },
];

export function getRubrics(taxonomyVersion = TAXONOMY_VERSION): TraitRubric[] {
  return REGISTRY.filter((r) => r.taxonomy_version === taxonomyVersion);
}

export function getRubric(traitKey: string, taxonomyVersion = TAXONOMY_VERSION): TraitRubric | undefined {
  return REGISTRY.find((r) => r.trait_key === traitKey && r.taxonomy_version === taxonomyVersion);
}
