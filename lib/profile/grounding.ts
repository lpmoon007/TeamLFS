import 'server-only';

// Grounding validator — enforces the no-invention guarantee OUTSIDE the prompt. Prompt rules
// are a request; this is a gate: nothing renders until it passes (Screen-13 handoff §1C).
//
//   Hard violations (block + repair): numbers and quotations not present in the record.
//   Soft violations (warn + repair): proper nouns not present; absolute quantifiers with no
//     count in the same sentence (over-claiming from thin evidence).
//   Two failures in a row → the answer is replaced with a refusal (see the caller).
//
// The `record` is the participant's evidence pack, generated from the event log — nothing
// outside it is available to the model. That is what makes the coach honest.

export interface GroundingViolation {
  type: 'quote' | 'number' | 'name' | 'overclaim';
  value: string;
}
export interface GroundingResult {
  ok: boolean;
  hard: GroundingViolation[];
  soft: GroundingViolation[];
  verified: { numbers: number; quotes: number };
}
export interface GroundingIndex {
  text: string;
  numbers: Set<string>;
  nouns: Set<string>;
}

const norm = (s: string) =>
  s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();
const L = (s: string) => s.toLowerCase();

// Words legitimately capitalised in prose that are not claims about people.
const STOP = new Set(
  (
    "the a an and or but if then when while your you i we they it that this those these of to in on at for from by with as is are was were be been has have had do does did not no yes so because there here what which who whom whose how why all any both each few more most other some such only own same than too very can will just should now what's run runs week weeks day days month months year years high moderate provisional gap invariant candidate marker markers gaps."
  ).split(' '),
);

export function buildIndex(record: string): GroundingIndex {
  const n = norm(record);
  const numbers = new Set(record.match(/\d+(?:\.\d+)?/g) || []);
  const nouns = new Set<string>();
  (record.match(/\b[A-Z][a-zA-Z'’-]{2,}\b/g) || []).forEach((w) => nouns.add(w.toLowerCase()));
  return { text: n, numbers, nouns };
}

function allowedNumber(tok: string, idx: GroundingIndex): boolean {
  if (idx.numbers.has(tok)) return true;
  const v = parseFloat(tok);
  if (Number.isInteger(v) && v >= 0 && v <= 12) return true; // "three paragraphs", "two moves"
  if (Number.isInteger(v) && v >= 2024 && v <= 2035) return true; // years
  return false;
}

const ABSOLUTE = [
  'always', 'never', 'every time', 'invariably', 'without exception', 'consistently',
  'reliably', 'in every case', 'no exceptions', 'the rule is', 'you do this every', 'each and every',
];

// Absolute quantifiers over-claim from thin evidence. Legitimate only when the count is in
// the same sentence: "never below 77 across four runs" is fine, "you never go to them" is not.
function checkOverclaim(text: string): GroundingViolation[] {
  const out: GroundingViolation[] = [];
  text.split(/(?<=[.!?])\s+/).forEach((sent) => {
    const t = L(sent);
    const hits = ABSOLUTE.filter((w) => t.includes(w));
    if (!hits.length) return;
    const hasCount = /\d/.test(sent) || /\b(one|two|three|four|five|six|both)\b/i.test(sent);
    if (!hasCount) out.push({ type: 'overclaim', value: `${hits[0]} — "${sent.trim().slice(0, 80)}"` });
  });
  return out;
}

export function validate(text: string, idx: GroundingIndex): GroundingResult {
  const hard: GroundingViolation[] = [];
  const soft: GroundingViolation[] = [];
  const body = text.replace(/\[\[EV:[\s\S]*?\]\]/g, (m) => m); // keep evidence chips — they carry claims too

  // 1. quotations must exist verbatim in the record
  const quotes: string[] = [];
  (body.match(/[“"]([^”"]{8,240})[”"]/g) || []).forEach((q) => {
    const inner = q.slice(1, -1);
    quotes.push(inner);
    if (!idx.text.includes(norm(inner))) hard.push({ type: 'quote', value: inner.slice(0, 90) });
  });

  // 2. every number must be in the record (or a safe generic)
  const nums = body.match(/\d+(?:\.\d+)?/g) || [];
  const seen = new Set<string>();
  nums.forEach((tok) => {
    if (seen.has(tok)) return;
    seen.add(tok);
    if (!allowedNumber(tok, idx)) hard.push({ type: 'number', value: tok });
  });

  // 3. proper nouns should be in the record (soft — capitalisation is noisy)
  const propers = body.match(/\b[A-Z][a-zA-Z'’-]{2,}\b/g) || [];
  const seenN = new Set<string>();
  propers.forEach((w) => {
    const lw = w.toLowerCase();
    if (seenN.has(lw)) return;
    seenN.add(lw);
    if (STOP.has(lw)) return;
    if (idx.nouns.has(lw)) return;
    soft.push({ type: 'name', value: w });
  });

  return {
    ok: hard.length === 0 && soft.length === 0,
    hard,
    soft: soft.concat(checkOverclaim(body)),
    verified: { numbers: seen.size, quotes: quotes.length },
  };
}

export function repairPrompt(v: GroundingResult): string {
  const list = [...v.hard, ...v.soft].map((x) => `- ${x.type}: "${x.value}"`).join('\n');
  return (
    `GROUNDING VALIDATOR REJECTED YOUR LAST REPLY. These items are not present in the RECORD, or over-claim from thin evidence:\n${list}\n\n` +
    `Rewrite the reply using ONLY facts, figures, quotes and names that appear in the RECORD. For any "overclaim" item: either state the number of instances behind the claim in the same sentence, or drop the absolute wording — one instance is an instance, not a pattern. If a claim cannot be supported, say plainly that you cannot evidence it. Do not restate the rejected items.`
  );
}

export const REFUSAL =
  `I had an answer for that and my own validator rejected it — it contained a figure or a quote I can't trace to your log, so you're not seeing it.\n\n` +
  `That's the guardrail working rather than failing. Ask me again more narrowly, or ask about something in the record: the six markers, the claim ledger, the promise ledger, the conditional split, or what your next run tests.`;

/** Convenience: validate raw model text against a record string in one call. */
export function ground(text: string, record: string): GroundingResult {
  return validate(text, buildIndex(record));
}
