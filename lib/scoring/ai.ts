import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, SCORER_MODEL } from '@/lib/env';
import { getRubrics } from './registry';
import { scoreSession } from './score';
import type { ScoreOptions, SpineEvent, TraitScore } from './types';

// The AI coder (Behavioral Memory Spine §3) — the production seam the deterministic
// scorer was always a placeholder for. score.ts stays pure and free (flag-matching over
// Layer 1); THIS reads what a participant actually said/did and judges each trait the
// way a trained human coder would, citing the exact Layer-1 events that justify it.
//
// Contract preserved from the deterministic path:
//   * reads ONLY Layer-1 events (whole corpus stays re-scorable)
//   * every score cites evidence_event_ids (auditability)
//   * tagged taxonomy_version + scorer_version (nothing overwrites; a re-score = new rows)
// Robustness: the deterministic score is always computed as the base; the model's
// judgment overrides per-trait when available, and ANY failure (no key, model/parse
// error) leaves the heuristic base standing. Coder/version are honest per row.

/** Bump when the coder prompt / model contract changes. Distinct from the heuristic
 *  version so AI-coded rows are always distinguishable in trait_scores. */
export const AI_SCORER_VERSION = 'v0.1.0-ai';

const MAX_EVENTS = 240; // cap the digest; a session rarely exceeds this per participant
const MAX_BODY = 320; // per-event body preview

interface AiVerdict {
  trait_key: string;
  value_num: number;
  confidence: number;
  evidence_refs: string[];
}

function eventBody(e: SpineEvent): string {
  const p = (e.payload_json ?? {}) as any;
  const b = p.body ?? p.text ?? p.edited_text ?? p.preview ?? '';
  return String(b).replace(/\s+/g, ' ').trim().slice(0, MAX_BODY);
}

/** Compact, model-legible digest of a participant's Layer-1 log. `ref` is a short,
 *  stable handle the model cites; we map it back to the full event id. */
function buildDigest(events: SpineEvent[]): { lines: string[]; refToId: Map<string, string> } {
  const refToId = new Map<string, string>();
  const lines: string[] = [];
  for (const e of events.slice(0, MAX_EVENTS)) {
    const ref = e.id.slice(0, 8);
    refToId.set(ref, e.id);
    const kind = e.derived ? 'OMISSION' : e.type;
    const chan = e.channel ? `/${e.channel}` : '';
    const to = e.target ? ` → ${e.target}` : '';
    const body = eventBody(e);
    lines.push(`[${ref}] ${kind}${chan}${to}${body ? `: "${body}"` : ''}`);
  }
  return { lines, refToId };
}

function buildSystem(): string {
  return (
    'You are a behavioral coder for a leadership crisis simulation. You read one ' +
    "participant's raw activity log — every act AND omission (messages, docs, calls, and " +
    'the things they never opened or answered) — and score their behavioral posture on a ' +
    'set of dynamics, exactly as a trained human coder applying a fixed rubric would.\n\n' +
    'Rules:\n' +
    '- Judge ONLY from the log provided. Cite the specific [ref] events that justify each score.\n' +
    '- value_num is the axis position in [-1, 1]: +1 = fully the POSITIVE pole, -1 = fully the ' +
    'NEGATIVE pole, 0 = mixed/neutral. Read each rubric\'s poles carefully — the positive pole ' +
    'is often the LESS flattering one (e.g. "suspect", "hoard").\n' +
    '- confidence in [0, 1] reflects how much evidence there is. With little or no relevant ' +
    'evidence, return low confidence and value_num near 0 — never a confident guess.\n' +
    '- Omissions are evidence: a demand left unanswered, a brief never opened, a thread ignored ' +
    'all speak to posture.\n' +
    'Return ONLY strict minified JSON, no prose, this exact shape:\n' +
    '{"scores":[{"trait_key":"<key>","value_num":<num>,"confidence":<num>,"evidence_refs":["<ref>",...]}]}'
  );
}

function buildUser(digestLines: string[], rubrics: ReturnType<typeof getRubrics>): string {
  const rubricBlock = rubrics
    .map(
      (r) =>
        `- ${r.trait_key}: ${r.definition} Poles → positive="${r.poles.positive}", negative="${r.poles.negative}", ` +
        `neutral="${r.poles.neutral}". Observable signals: ${r.observable_signals.join('; ')}.`,
    )
    .join('\n');
  return (
    `RUBRICS (score every one):\n${rubricBlock}\n\n` +
    `PARTICIPANT LOG (${digestLines.length} events, chronological):\n${digestLines.join('\n') || '(no recorded activity)'}`
  );
}

function parseVerdicts(text: string | null | undefined): AiVerdict[] | null {
  if (!text) return null;
  const t = text.trim().replace(/```json/gi, '').replace(/```/g, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try {
    const parsed = JSON.parse(t.slice(a, b + 1));
    if (Array.isArray(parsed?.scores)) return parsed.scores as AiVerdict[];
  } catch {
    /* fall through */
  }
  return null;
}

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0);

/**
 * AI-first scorer. Delegates to the deterministic base, then overlays the model's
 * per-trait judgment where available. Same TraitScore shape, so callers don't change.
 */
export async function aiScoreSession(
  events: SpineEvent[],
  ctx: { participantId: string; sessionId: string },
  opts: ScoreOptions = {},
): Promise<TraitScore[]> {
  const rubrics = getRubrics(opts.taxonomyVersion).filter((r) => !opts.traitKeys || opts.traitKeys.includes(r.trait_key));
  // Always compute the deterministic base — free, and the graceful fallback.
  const base = scoreSession(events, ctx, opts);
  const baseByKey = new Map(base.map((s) => [s.trait_key, s]));

  const mine = events.filter((e) => e.participant_id === ctx.participantId);
  if (!mine.length) return base;

  let verdicts: AiVerdict[] | null = null;
  try {
    const { lines, refToId } = buildDigest(mine);
    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({
      model: SCORER_MODEL,
      max_tokens: 1500,
      system: buildSystem(),
      messages: [{ role: 'user', content: buildUser(lines, rubrics) }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    verdicts = parseVerdicts(text);
    if (!verdicts) return base;

    const validRefs = refToId;
    const out: TraitScore[] = [];
    const scoredKeys = new Set<string>();
    for (const r of rubrics) {
      const v = verdicts.find((x) => x.trait_key === r.trait_key);
      if (!v) {
        out.push(baseByKey.get(r.trait_key)!); // model skipped it → keep heuristic
        continue;
      }
      scoredKeys.add(r.trait_key);
      const value_num = clamp(Number(v.value_num), -1, 1);
      const confidence = clamp(Number(v.confidence), 0, 1);
      // model-cited evidence, validated back to real event ids; else the extractor's.
      const cited = (v.evidence_refs ?? [])
        .map((ref) => validRefs.get(String(ref).slice(0, 8)))
        .filter((id): id is string => !!id);
      const evidence = cited.length ? [...new Set(cited)] : baseByKey.get(r.trait_key)?.evidence_event_ids ?? [];
      const value = value_num > 0.2 ? r.poles.positive : value_num < -0.2 ? r.poles.negative : r.poles.neutral;
      out.push({
        participant_id: ctx.participantId,
        session_id: ctx.sessionId,
        taxonomy_version: r.taxonomy_version,
        scorer_version: AI_SCORER_VERSION,
        trait_key: r.trait_key,
        value: confidence === 0 ? null : value,
        value_num: confidence === 0 ? null : value_num,
        confidence,
        evidence_event_ids: evidence,
        coder: 'ai',
      });
    }
    return out;
  } catch {
    return base; // no key / model / parse error → the deterministic snapshot stands
  }
}
