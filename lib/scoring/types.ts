// Scoring pipeline types (Behavioral Memory Spine §3).
// The scoring function is the load-bearing wall — it turns a raw Layer-1 event log
// into versioned trait scores, and it reads ONLY Layer 1 (so the whole corpus is
// re-scorable when a rubric improves).

/** A Layer-1 event, as read by the scorer (mirrors the `events` table). */
export interface SpineEvent {
  id: string;
  session_id: string;
  participant_id: string;
  seat_id: string | null;
  ts: string;
  scenario_ms: number | null;
  type: string;
  channel: EventChannel | null;
  target: string | null;
  payload_json: Record<string, unknown>;
  derived: boolean;
}

export type EventChannel = 'message' | 'group' | 'email' | 'call' | 'doc' | 'brief' | 'system';

export type Coder = 'ai' | 'human' | 'consensus';
export type TraitStatus = 'hypothesis' | 'validated';

/**
 * The evidence a rubric extracts from the event log for one participant.
 * `signal` supports the trait's positive pole, `counter` opposes it; both cite the
 * exact events that justify them (§3.4 auditability).
 */
export interface Evidence {
  signalEventIds: string[];
  counterEventIds: string[];
}

/** A versioned rubric for one behavioral dynamic. Rubric = the science. */
export interface TraitRubric {
  trait_key: string;
  taxonomy_version: string;
  definition: string;
  observable_signals: string[];
  status: TraitStatus;
  /** Positive/negative categorical pole labels for value (e.g. compete / collaborate). */
  poles: { positive: string; negative: string; neutral: string };
  /** Pure function over Layer-1 events → cited evidence. No side effects. */
  evidence: (events: SpineEvent[]) => Evidence;
}

/** A produced score. Shape mirrors the `trait_scores` table. */
export interface TraitScore {
  participant_id: string;
  session_id: string;
  taxonomy_version: string;
  scorer_version: string;
  trait_key: string;
  value: string | null;
  value_num: number | null;
  confidence: number; // 0..1
  evidence_event_ids: string[];
  coder: Coder;
}

export interface ScoreOptions {
  taxonomyVersion?: string;
  /** Restrict to these trait_keys; default = all in the taxonomy. */
  traitKeys?: string[];
}
