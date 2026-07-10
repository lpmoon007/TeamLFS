import 'server-only';
// The solo AI referee + in-character advisor reply — contracts lifted verbatim from
// crisis-engine.js (genReply / matchHold / referee / fallbackRuling). Same server
// capability family as team npc-reply. Pure prompt builders + parsing + the
// deterministic fallback (no DB, no network here — the caller does the model call).

export interface Advisor {
  id: string;
  name: string;
  role: string;
  voice?: string;
  priority?: string;
  fallbackReply?: string;
  fallbackReact?: string;
}
export interface Week {
  n: number;
  title: string;
  situation: string;
  advocacy: Record<string, string>;
}
export interface Ruling {
  narrative: string;
  deltas: Record<string, number>;
  dims: Record<string, number>;
  teamReactions: { who: string; text: string }[];
}
export interface Conduct {
  asked: number;
  contactedNames: string[];
  ignored: string[];
  surfaced: string[];
  missed: string[];
  reprieves: number;
  underBuzzer: boolean;
}

// ---- pull-to-ask: in-character advisor reply ----
export function buildReplySystem(a: Advisor, w: Week, companyName: string, refereeContext: string): string {
  return (
    `You are ${a.name}, ${a.role} at ${companyName}, ${refereeContext}. Your character voice: ${a.voice}. ` +
    `Your standing priority under pressure: ${a.priority}. It is Week ${w.n}: ${w.title}. Situation: ${w.situation}\n` +
    `The CEO (the user) has just messaged you. Reply IN CHARACTER, first person, to the CEO. Be concrete and human, ` +
    `2-4 sentences. Do not narrate or use stage directions. Do not resolve the whole crisis — you're one voice with ` +
    `one view. Advocate your priority honestly but don't be a caricature.`
  );
}

export function cleanReply(out: string | null | undefined, fallback: string): string {
  const clean = (out ?? '').trim().replace(/^["“]|["”]$/g, '');
  return clean || fallback || 'Understood. Let me get you what you need.';
}

// held-info reveal on a targeted ask (crisis-engine.js matchHold)
export function matchHold(text: string, hold: { trigger_hints?: string[]; triggerHints?: string[]; topic?: string }): boolean {
  const low = text.toLowerCase();
  const hints = hold.trigger_hints ?? hold.triggerHints ?? [];
  if (hints.some((h) => low.includes(String(h).toLowerCase()))) return true;
  if (hold.topic) {
    const lastWord = hold.topic.toLowerCase().split(' ').slice(-1)[0];
    if (lastWord && low.includes(lastWord)) return true;
  }
  return false;
}

// ---- the referee: rule a free-text decision against the world model ----
export function buildRefereeSystem(
  content: any,
  w: Week,
  drivers: Record<string, number>,
  conduct: Conduct,
  decidedDay: number,
): string {
  const DRIVERS = content.DRIVERS ?? {};
  const DIMS = content.DIMENSIONS ?? {};
  const TEAM: Advisor[] = content.TEAM ?? [];
  const nameById = Object.fromEntries(TEAM.map((t) => [t.id, t.name]));
  const dk = Object.keys(DRIVERS);
  const dimk = Object.keys(DIMS);

  const driverList = dk.map((k) => `${DRIVERS[k].label} ${Math.round(drivers[k] ?? DRIVERS[k].val)}`).join(', ');
  const deltaShape = dk.map((k) => `"${k}":<int ${DRIVERS[k].deltaRange || '-20..15'}>`).join(',');
  const dimShape = dimk.map((k) => `"${k}":<int -2..2>`).join(',');
  const ids = TEAM.map((t) => t.id).join('|');
  const advocacy = Object.entries(w.advocacy ?? {})
    .map(([id, t]) => `${nameById[id] ?? id}: "${t}"`)
    .join(' | ');

  return (
    `You are the referee of a leadership crisis simulation for ${content.COMPANY?.name}, ${content.REFEREE_CONTEXT}. ` +
    `You are fair, sharp, and unsentimental. You never coach the player or reveal a "right answer." You rule on the ` +
    `CEO's written decision by reading it against the world model, then translate it into consequences.\n\n` +
    `WORLD MODEL (current): ${driverList}.\n` +
    `WEEK ${w.n} — ${w.title}. Situation: ${w.situation}\n` +
    `Team advocated competing priorities: ${advocacy}\n\n` +
    `CONDUCT THIS WEEK: The CEO reached out to ${conduct.asked} of ${TEAM.length} advisors ` +
    `(${conduct.contactedNames.join(', ') || 'none'}); did not contact ${conduct.ignored.join(', ') || 'no one'}. ` +
    `${conduct.surfaced.length ? 'They surfaced held information from ' + conduct.surfaced.join(', ') + '.' : 'They surfaced no hidden information.'} ` +
    `${conduct.missed.length ? 'There was critical information still held by ' + conduct.missed.join(', ') + ' that they never asked for.' : ''} ` +
    `Reprieves used: ${conduct.reprieves}. Decided on day ${decidedDay} of ${content.CONFIG?.days}.` +
    `${conduct.underBuzzer ? ' The CEO did not decide until the clock fully ran out and they were forced to the buzzer — weigh this as a sign of indecision, though the fact they still made a real call under maximum pressure is itself worth reading.' : ''}\n\n` +
    `Return ONLY strict minified JSON, no prose, this exact shape:\n` +
    `{"narrative":"2-3 sentences: what happens in the world as a result of this decision, concrete and in-fiction, no coaching","deltas":{${deltaShape}},"dims":{${dimShape}},"teamReactions":[{"who":"<advisor id: ${ids}>","text":"one in-character sentence reacting to the decision AND how they were treated"},{"who":"<different id>","text":"..."}]}\n` +
    `Scoring guidance: ${content.REFEREE_SCORING || 'reward decisiveness that is also informed; penalize decisions made while ignoring advisors who held critical info.'}`
  );
}

export function parseRulingJSON(s: string | null | undefined): Ruling | null {
  if (!s) return null;
  const t = s.trim().replace(/```json/gi, '').replace(/```/g, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try {
    const parsed = JSON.parse(t.slice(a, b + 1));
    if (parsed && parsed.deltas && parsed.dims) return parsed as Ruling;
  } catch {
    /* fall through */
  }
  return null;
}

// Reconstitute an authored logic function stored as { __fn: "<source>" } (trusted,
// server-side, our own content). Returns null on any failure.
export function reconstitute(marker: any): ((...a: any[]) => any) | null {
  if (!marker || typeof marker.__fn !== 'string') return null;
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${marker.__fn})`)() as (...a: any[]) => any;
  } catch {
    return null;
  }
}

// deterministic fallback ruling (crisis-engine.js fallbackRuling)
export function fallbackRuling(content: any, text: string, conduct: Conduct, decidedDay: number): Ruling {
  const low = text.toLowerCase();
  const has = (...ws: string[]) => ws.some((x) => low.includes(x));
  const DRIVERS = content.DRIVERS ?? {};
  const DIMS = content.DIMENSIONS ?? {};
  const TEAM: Advisor[] = content.TEAM ?? [];
  const deltas: Record<string, number> = Object.fromEntries(Object.keys(DRIVERS).map((k) => [k, 0]));
  const dims: Record<string, number> = Object.fromEntries(Object.keys(DIMS).map((k) => [k, 0]));

  for (const rule of content.FALLBACK_RULES ?? []) {
    if ((rule.kw ?? []).some((x: string) => low.includes(x))) {
      for (const k in rule.deltas ?? {}) deltas[k] = (deltas[k] ?? 0) + rule.deltas[k];
      for (const k in rule.dims ?? {}) dims[k] = (dims[k] ?? 0) + rule.dims[k];
    }
  }
  const bump = (k: string | undefined, n: number) => {
    if (k && dims[k] !== undefined) dims[k] += n;
  };
  const timingDim = content.TIMING_DIM || 'decisiveness';
  const inqDim = content.INQUIRY_DIM || 'inquiry';
  const condDim = content.CONDUCT_DIM || 'conduct';
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 25 && has('will', "i'm", "we're", 'by', 'today', 'this week', 'directive')) bump(timingDim, 1);
  if (decidedDay <= 3) bump(timingDim, 1);
  if (conduct.underBuzzer) bump(timingDim, -1);
  if (conduct.reprieves > 0) bump(timingDim, -conduct.reprieves);
  if (conduct.surfaced.length) bump(inqDim, 2);
  else if (conduct.missed.length) bump(inqDim, -1);
  if (conduct.asked === 0) {
    bump(inqDim, -1);
    bump(condDim, -1);
  }
  if (has('thank', 'i know', 'i understand', 'i hear', 'difficult', 'not easy', 'to the team', 'to everyone')) bump(condDim, 1);
  for (const k of Object.keys(dims)) dims[k] = Math.max(-2, Math.min(2, dims[k]));

  const fnNarr = reconstitute(content.fallbackNarrative);
  let narrative = '';
  try {
    narrative = fnNarr ? String(fnNarr(has, conduct)) : '';
  } catch {
    narrative = '';
  }
  if (!narrative) {
    narrative = `Your directive moves through the organization over the days that follow. ${conduct.missed.length ? "What you weren't told still moves under the surface." : ''} The room absorbs the call and adjusts.`;
  }
  const teamReactions = TEAM.slice(0, 2).map((t) => ({
    who: t.id,
    text: t.fallbackReact || "It's a call. I'll carry it — we'll see in a week if it was the right one.",
  }));
  return { narrative: narrative.replace(/\s+/g, ' ').trim(), deltas, dims, teamReactions };
}

// clamp driver deltas onto current values (crisis-engine.js applyDeltas)
export function applyDeltas(content: any, drivers: Record<string, number>, deltas: Record<string, number>): Record<string, number> {
  const DRIVERS = content.DRIVERS ?? {};
  const next: Record<string, number> = { ...drivers };
  for (const k of Object.keys(DRIVERS)) {
    const dr = DRIVERS[k];
    const mx = (dr.max ?? 100) + (dr.overflow ?? 0);
    next[k] = Math.max(dr.min ?? 0, Math.min(mx, (next[k] ?? dr.val) + (deltas[k] || 0)));
  }
  return next;
}
