import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiScoreSession, toTraitScoreRows, getRubric } from '@/lib/scoring';
import type { SpineEvent, TraitScore } from '@/lib/scoring/types';

// Phase 9 — the cross-session Behavioral Memory Spine: identity, accumulation, and the
// first read that feeds back into the engine (disposition from history). Everything
// here is a Layer-2 read/write over the LOCKED Layer-1 log; nothing mutates capture.

type Db = ReturnType<typeof createAdminClient>;

// ---- identity ----------------------------------------------------------------

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9._@-]/g, '').slice(0, 120);
}

/** Get-or-create the person (subject) behind a participant, by (org, handle). Handle
 *  is email when we have it (stable identity), else a name slug. Returns null when we
 *  have no stable handle at all (anonymous run — no cross-session linkage possible). */
export async function resolveSubject(
  db: Db,
  p: { orgId: string | null; email?: string | null; name?: string | null },
): Promise<{ id: string } | null> {
  const handleRaw = (p.email && p.email.trim()) || (p.name && p.name.trim()) || '';
  if (!handleRaw) return null;
  const handle = slug(handleRaw);
  if (!handle) return null;

  const q = db.from('subjects').select('id').eq('handle', handle);
  const { data: found } = await (p.orgId ? q.eq('org_id', p.orgId) : q.is('org_id', null)).maybeSingle<any>();
  if (found) return { id: found.id };

  const { data: created } = await db
    .from('subjects')
    .insert({ org_id: p.orgId, handle, display_name: (p.name ?? '').trim() || null })
    .select('id')
    .maybeSingle<any>();
  return created ? { id: created.id } : null;
}

/** Resolve (and cache onto the participant) the subject for a session occupant. */
export async function subjectForParticipant(db: Db, sessionId: string, participantId: string): Promise<string | null> {
  const { data: p } = await db
    .from('participants')
    .select('id, subject_id, name, email, session:sessions!inner(scenario:scenarios!inner(org_id))')
    .eq('id', participantId)
    .maybeSingle<any>();
  if (!p) return null;
  if (p.subject_id) return p.subject_id;

  const orgId: string | null = p.session?.scenario?.org_id ?? null;
  const subject = await resolveSubject(db, { orgId, email: p.email, name: p.name });
  if (!subject) return null;
  await db.from('participants').update({ subject_id: subject.id }).eq('id', participantId);
  return subject.id;
}

// ---- accumulation ------------------------------------------------------------

/** Append a session's trait scores to the subject's longitudinal trajectory (the
 *  cross-session profile). Keyed on subject_id so it spans all of a person's runs. */
export async function appendProfile(
  db: Db,
  args: { subjectId: string; participantId: string; orgId: string | null; sessionId: string; scores: TraitScore[] },
): Promise<void> {
  if (!args.scores.length) return;
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from('behavioral_profile')
    .select('id, trait_key, taxonomy_version, trajectory_json')
    .eq('subject_id', args.subjectId);
  const byKey = new Map((existing ?? []).map((r: any) => [`${r.trait_key}:${r.taxonomy_version}`, r]));

  for (const s of args.scores) {
    const k = `${s.trait_key}:${s.taxonomy_version}`;
    const point = { session_id: args.sessionId, value: s.value, value_num: s.value_num, confidence: s.confidence, at: now };
    const prior = byKey.get(k);
    const trajectory = Array.isArray(prior?.trajectory_json) ? prior.trajectory_json : [];
    const next = [...trajectory.filter((t: any) => t.session_id !== args.sessionId), point];
    await db.from('behavioral_profile').upsert(
      {
        // keep the legacy participant-keyed uniqueness satisfied while subject_id is
        // the real accumulation key (see the unique index on the table).
        participant_id: args.participantId,
        subject_id: args.subjectId,
        org_id: args.orgId,
        trait_key: s.trait_key,
        taxonomy_version: s.taxonomy_version,
        trajectory_json: next,
        last_session_id: args.sessionId,
        updated_at: now,
      },
      { onConflict: 'participant_id,trait_key,taxonomy_version' },
    );
  }
}

// ---- read: posture + disposition from history --------------------------------

export interface SubjectPosture {
  sessions: number; // distinct prior sessions with evidence
  traits: { trait_key: string; mean: number; confidence: number; points: number }[];
}

/** Confidence-weighted mean value_num per trait across all of a subject's sessions. */
export async function subjectPosture(db: Db, subjectId: string): Promise<SubjectPosture> {
  const { data: rows } = await db
    .from('behavioral_profile')
    .select('trait_key, trajectory_json')
    .eq('subject_id', subjectId);
  const sessionIds = new Set<string>();
  const traits: SubjectPosture['traits'] = [];
  for (const r of (rows ?? []) as any[]) {
    const pts = (Array.isArray(r.trajectory_json) ? r.trajectory_json : []).filter((p: any) => typeof p.value_num === 'number');
    for (const p of pts) if (p.session_id) sessionIds.add(p.session_id);
    if (!pts.length) continue;
    let num = 0;
    let den = 0;
    for (const p of pts) {
      const w = Math.max(0.05, Number(p.confidence) || 0);
      num += (Number(p.value_num) || 0) * w;
      den += w;
    }
    traits.push({ trait_key: r.trait_key, mean: den ? num / den : 0, confidence: den, points: pts.length });
  }
  return { sessions: sessionIds.size, traits };
}

export interface LensHistory {
  sessions: number;
  trend: { trait_key: string; pole: string } | null;
}

/** Cross-session read for the LDOL Learning discipline: how many prior sessions this
 *  person has, and the strongest directional trait as a pole label. */
export async function lensHistoryForParticipant(db: Db, sessionId: string, participantId: string): Promise<LensHistory> {
  const subjectId = await subjectForParticipant(db, sessionId, participantId);
  if (!subjectId) return { sessions: 0, trend: null };
  const posture = await subjectPosture(db, subjectId);
  if (posture.sessions <= 1) return { sessions: posture.sessions, trend: null };
  // strongest directional trait → its dominant pole (registry poles map mean → pole)
  const strongest = posture.traits.filter((t) => Math.abs(t.mean) > 0.2).sort((a, b) => Math.abs(b.mean) - Math.abs(a.mean))[0];
  if (!strongest) return { sessions: posture.sessions, trend: null };
  const rubric = getRubric(strongest.trait_key);
  const pole = !rubric ? null : strongest.mean > 0.2 ? rubric.poles.positive : strongest.mean < -0.2 ? rubric.poles.negative : rubric.poles.neutral;
  return { sessions: posture.sessions, trend: pole ? { trait_key: strongest.trait_key, pole } : null };
}

// A3.2 — the disposition a leader EARNS. "This is not a setting; it is a consequence
// of how you've led before." We read the traits that govern whether people bring a
// leader hard news and sign-align them to a single "forthcoming" score (higher = the
// team volunteers more). Pole directions from the registry:
//   trust_vs_suspect  positive='suspect'  → trusting leader is the NEGATIVE pole
//   hoard_vs_share    positive='hoard'    → sharing leader is the NEGATIVE pole
//   status_behavior   positive='attentive'→ attentive leader is the POSITIVE pole
//   continuity_vs_drop positive='continuity' → closing loops is the POSITIVE pole
// v0.1 HYPOTHESIS mapping (not a validated claim) — versioned with the taxonomy.
const FORTHCOMING_WEIGHTS: Record<string, number> = {
  trust_vs_suspect: -1,
  hoard_vs_share: -1,
  status_behavior: +1,
  continuity_vs_drop: +1,
};

export interface ResolvedDisposition {
  disposition: 'served' | 'request' | 'guarded';
  resolvedFromHistory: boolean;
  sessions: number;
  score: number | null; // the forthcoming score, for facilitator transparency
}

/** Resolve a run's disposition from the subject's cross-session posture. Neutral
 *  ('request') when there is no usable history — the most common team a leader has. */
export async function resolveDispositionFromHistory(db: Db, subjectId: string | null): Promise<ResolvedDisposition> {
  if (!subjectId) return { disposition: 'request', resolvedFromHistory: false, sessions: 0, score: null };
  const posture = await subjectPosture(db, subjectId);
  const relevant = posture.traits.filter((t) => FORTHCOMING_WEIGHTS[t.trait_key] !== undefined);
  if (posture.sessions === 0 || relevant.length === 0) {
    return { disposition: 'request', resolvedFromHistory: false, sessions: posture.sessions, score: null };
  }
  let num = 0;
  let den = 0;
  for (const t of relevant) {
    const sign = FORTHCOMING_WEIGHTS[t.trait_key];
    const w = Math.max(0.05, t.confidence);
    num += sign * t.mean * w;
    den += w;
  }
  const score = den ? num / den : 0;
  const disposition = score >= 0.33 ? 'served' : score <= -0.2 ? 'guarded' : 'request';
  return { disposition, resolvedFromHistory: true, sessions: posture.sessions, score };
}

// ---- solo run scoring (feed the spine from a solo playthrough) ----------------

/** Score a solo run's CEO from the raw log and append to the cross-session profile.
 *  Called at the final decision (soloDecide) so a solo playthrough builds the spine
 *  exactly as a team session does at finalize. Uses the AI coder (deterministic
 *  fallback baked in). */
export async function scoreSoloRun(db: Db, sessionId: string, participantId: string): Promise<number> {
  const { data: rawEvents } = await db
    .from('events')
    .select('id, session_id, participant_id, seat_id, ts, scenario_ms, type, channel, target, payload_json, derived')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId);
  const events = (rawEvents ?? []) as SpineEvent[];
  if (!events.length) return 0;

  const scores: TraitScore[] = await aiScoreSession(events, { participantId, sessionId });

  // versioned: replace this run's snapshot, then re-persist
  await db.from('trait_scores').delete().eq('session_id', sessionId).eq('participant_id', participantId);
  if (scores.length) await db.from('trait_scores').insert(toTraitScoreRows(scores));

  const { data: sess } = await db.from('sessions').select('scenario:scenarios!inner(org_id)').eq('id', sessionId).maybeSingle<any>();
  const orgId: string | null = sess?.scenario?.org_id ?? null;
  const subjectId = await subjectForParticipant(db, sessionId, participantId);
  if (subjectId) await appendProfile(db, { subjectId, participantId, orgId, sessionId, scores });
  return scores.length;
}
