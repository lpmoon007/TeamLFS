import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreSession, aiScoreSession, toTraitScoreRows, AI_SCORER_VERSION } from '@/lib/scoring';
import type { SpineEvent, TraitScore } from '@/lib/scoring/types';
import { subjectForParticipant, appendProfile } from '@/lib/spine';

// The re-score harness (Behavioral Memory Spine §3, §9). Proves the spine's core
// promise — "every past session is re-interpretable from Layer 1 with zero re-run" —
// and produces the AI-vs-heuristic comparison that inter-rater reliability measurement
// needs. Re-reads the LOCKED event log, runs both coders, and reports where they
// agree/disagree per trait. Dry-run by default; `persist` writes the fresh AI snapshot
// (versioned — never clobbers, a re-score is new rows).
//
// The comparison is generic (coder A vs coder B), so the same harness diffs AI vs a
// human coder later — the human's scores are just another TraitScore[] set.

type Db = ReturnType<typeof createAdminClient>;

const val = (s?: TraitScore) => (s ? { value: s.value, value_num: s.value_num, confidence: s.confidence, scorer_version: s.scorer_version } : null);

export interface TraitComparison {
  trait_key: string;
  a: ReturnType<typeof val>;
  b: ReturnType<typeof val>;
  bothScored: boolean; // both sides produced a non-null value_num
  poleAgree: boolean | null; // categorical pole match, null when not comparable
  deltaNum: number | null; // |b.value_num - a.value_num| when both non-null
}

/** Compare two coder outputs for one participant, keyed by trait. Pure. */
export function compareScoreSets(a: TraitScore[], b: TraitScore[]): TraitComparison[] {
  const bByKey = new Map(b.map((s) => [s.trait_key, s]));
  return a.map((sa) => {
    const sb = bByKey.get(sa.trait_key);
    const aNum = sa.value_num;
    const bNum = sb?.value_num ?? null;
    const bothScored = aNum !== null && bNum !== null && aNum !== undefined && bNum !== undefined;
    return {
      trait_key: sa.trait_key,
      a: val(sa),
      b: val(sb),
      bothScored,
      poleAgree: sa.value != null && sb?.value != null ? sa.value === sb.value : null,
      deltaNum: bothScored ? Math.abs((bNum as number) - (aNum as number)) : null,
    };
  });
}

export interface TraitAgreement {
  trait_key: string;
  n: number; // comparable pairs (both scored)
  poleAgreementPct: number | null; // % categorical agreement over pairs with both poles
  meanAbsDelta: number | null; // mean |Δ value_num| over comparable pairs
}
export interface AgreementSummary {
  comparablePairs: number;
  poleAgreementPct: number | null;
  meanAbsDelta: number | null;
  byTrait: TraitAgreement[];
}

/** Aggregate agreement across many per-trait comparisons (the reliability seed). Pure. */
export function aggregateAgreement(comparisons: TraitComparison[]): AgreementSummary {
  const byKey = new Map<string, TraitComparison[]>();
  for (const c of comparisons) {
    if (!byKey.has(c.trait_key)) byKey.set(c.trait_key, []);
    byKey.get(c.trait_key)!.push(c);
  }
  const byTrait: TraitAgreement[] = [];
  let totalPairs = 0;
  let totalPoleAgree = 0;
  let totalPoleComparable = 0;
  let deltaSum = 0;
  let deltaN = 0;
  for (const [trait_key, cs] of byKey) {
    const pairs = cs.filter((c) => c.bothScored);
    const poleComparable = cs.filter((c) => c.poleAgree !== null);
    const poleAgree = poleComparable.filter((c) => c.poleAgree === true).length;
    const deltas = pairs.map((c) => c.deltaNum as number);
    totalPairs += pairs.length;
    totalPoleAgree += poleAgree;
    totalPoleComparable += poleComparable.length;
    deltaSum += deltas.reduce((s, d) => s + d, 0);
    deltaN += deltas.length;
    byTrait.push({
      trait_key,
      n: pairs.length,
      poleAgreementPct: poleComparable.length ? round((poleAgree / poleComparable.length) * 100) : null,
      meanAbsDelta: deltas.length ? round(deltas.reduce((s, d) => s + d, 0) / deltas.length) : null,
    });
  }
  return {
    comparablePairs: totalPairs,
    poleAgreementPct: totalPoleComparable ? round((totalPoleAgree / totalPoleComparable) * 100) : null,
    meanAbsDelta: deltaN ? round(deltaSum / deltaN) : null,
    byTrait: byTrait.sort((x, y) => x.trait_key.localeCompare(y.trait_key)),
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export interface RescoreReport {
  ok: boolean;
  reason?: string;
  sessionId?: string;
  participants?: number;
  aiVerdicts?: number; // per-trait scores the AI coder actually produced (0 = coder unavailable)
  persisted?: boolean;
  perParticipant?: { participantId: string; comparisons: TraitComparison[] }[];
  agreement?: AgreementSummary;
}

/**
 * Re-score a session from Layer 1 and diff the AI coder against the deterministic
 * heuristic. `persist` replaces the session's trait_scores snapshot with the fresh AI
 * scores and updates the cross-session profile (versioned — safe to re-run).
 */
export async function rescoreSession(sessionId: string, opts: { persist?: boolean } = {}): Promise<RescoreReport> {
  const db = createAdminClient();

  const { data: session } = await db.from('sessions').select('id, scenario:scenarios!inner(org_id)').eq('id', sessionId).maybeSingle<any>();
  if (!session) return { ok: false, reason: 'not_found' };
  const orgId: string | null = session.scenario?.org_id ?? null;

  const { data: rawEvents } = await db
    .from('events')
    .select('id, session_id, participant_id, seat_id, ts, scenario_ms, type, channel, target, payload_json, derived')
    .eq('session_id', sessionId);
  const events = (rawEvents ?? []) as SpineEvent[];

  const { data: participants } = await db.from('participants').select('id').eq('session_id', sessionId);
  const pids = (participants ?? []).map((p: any) => p.id as string);
  if (!pids.length) return { ok: false, reason: 'no_participants' };

  const perParticipant: RescoreReport['perParticipant'] = [];
  const allComparisons: TraitComparison[] = [];
  let aiVerdicts = 0;

  for (const pid of pids) {
    const ctx = { participantId: pid, sessionId };
    const heuristic = scoreSession(events, ctx); // coder A: deterministic base
    const ai = await aiScoreSession(events, ctx); // coder B: production (AI overlay, heuristic fallback)
    aiVerdicts += ai.filter((s) => s.scorer_version === AI_SCORER_VERSION).length;

    const comparisons = compareScoreSets(heuristic, ai);
    perParticipant.push({ participantId: pid, comparisons });
    allComparisons.push(...comparisons);

    if (opts.persist) {
      await db.from('trait_scores').delete().eq('session_id', sessionId).eq('participant_id', pid);
      if (ai.length) await db.from('trait_scores').insert(toTraitScoreRows(ai));
      const subjectId = await subjectForParticipant(db, sessionId, pid);
      if (subjectId) await appendProfile(db, { subjectId, participantId: pid, orgId, sessionId, scores: ai });
    }
  }

  return {
    ok: true,
    sessionId,
    participants: pids.length,
    aiVerdicts,
    persisted: !!opts.persist,
    perParticipant,
    agreement: aggregateAgreement(allComparisons),
  };
}
