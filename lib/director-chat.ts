'use server';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, VOICE_MODEL } from '@/lib/env';
import { buildSoloDebrief, buildSoloDebriefForFacilitator, type SoloDebrief } from '@/lib/solo-debrief';
import { isFacilitatorSession } from '@/lib/facilitator-session';

// The Director Chat (crisis-engine.js wireDirectorChat, re-housed). After a solo run the
// player can Q&A with the "Director" — an AI head-coach that has the whole game film and
// grounds every answer in the record. Works for the participant (token) and the
// facilitator (cookie), for every scenario, since it's built from the debrief data.

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface DirectorReply {
  ok: boolean;
  reply?: string;
}

const strip = (s: string | null | undefined) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// The persona + the complete run record — the coach never invents anything outside this.
function buildContext(d: SoloDebrief): string {
  const persona =
    `You are the Director — the AI that ran and watched this leadership simulation. You are now debriefing the ` +
    `participant one-on-one, like a head coach going through the game film. You have the complete record below. ` +
    `Your job: help them understand exactly WHERE and HOW they earned each score, in specifics — cite the week, the ` +
    `exact move, the person, the words they used. Never invent an event that is not in the record. Be direct and ` +
    `warm, never flattering. When they push back ("but I was truthful everywhere"), show them the specific gap ` +
    `between what they believe they did and what the record shows — usually it is timing (they named the hard thing ` +
    `late, or only after being forced), or it is surfacing-vs-acting (the fact reached them but they ruled on the ` +
    `room's version anyway). Keep answers to 2-4 short paragraphs. Second person ("you"). No headers, no bullet ` +
    `dumps unless they ask for a list.`;

  const dimLines = d.dims.map((x) => `- ${x.label}: ${x.score}/100 — ${strip(x.note)}`).join('\n');
  const missLines = d.counterfactuals.length
    ? d.counterfactuals.map((c) => `- MISSED: ${c.who} was holding "${c.topic ?? 'something decisive'}" — ${strip(c.text)}`).join('\n')
    : '- You surfaced what your team was holding every week.';
  const decLines = d.gameFilm.filter((m) => m.type === 'decision').map((m) => `- Week ${m.week}: ${strip(m.text)}`).join('\n');
  const filmLines = d.gameFilm.map((m) => `- Wk${m.week}${m.day ? ` D${m.day}` : ''} [${m.type}] ${strip(m.text)}`).join('\n');
  const coachLines = d.coaching.map((c) => `- ${c.label} (${c.score}/100): ${c.lines.map(strip).join(' | ')}`).join('\n');

  return (
    `${persona}\n\n` +
    `=== SIMULATION ===\n${d.scenarioTitle} — ${d.company?.name ?? ''}\n` +
    `Team disposition you were given: ${d.dispositionLabel}\n` +
    `Outcome: ${d.survived ? 'came through' : 'did not make it'} · Overall leadership read: ${d.overall}/100 (${d.grade})\n` +
    (d.ending ? `Ending [${d.ending.tone}]: ${strip(d.ending.title)} — ${strip(d.ending.txt)}\n` : '') +
    `\n=== YOUR SIX READS (scores) ===\n${dimLines}\n` +
    `\n=== HELD INFORMATION — the discipline of surfacing ===\n${missLines}\n` +
    `NOTE: surfacing a fact is not the same as acting on it, and timing matters — naming a hard truth late or only ` +
    `after being forced scores far below naming it early.\n` +
    `\n=== YOUR WEEKLY CALLS ===\n${decLines || '- (no decisions on record)'}\n` +
    `\n=== COACHING (your two weakest reads) ===\n${coachLines}\n` +
    `\n=== THE FULL GAME FILM (every event, in order) ===\n${filmLines}\n=== END OF RECORD ===`
  );
}

/** Ask the Director a question about the run. Grounded in the debrief record. */
export async function askDirector(params: {
  sessionId: string;
  token?: string;
  history: ChatTurn[];
  question: string;
}): Promise<DirectorReply> {
  const q = params.question.trim();
  if (!q) return { ok: false };

  // resolve the debrief record: participant token, else facilitator cookie
  let res: Awaited<ReturnType<typeof buildSoloDebrief>>;
  if (params.token) res = await buildSoloDebrief(params.sessionId, params.token);
  else if (await isFacilitatorSession()) res = await buildSoloDebriefForFacilitator(params.sessionId);
  else return { ok: false };
  if (!res.ok) return { ok: false };

  const system = buildContext(res.debrief);
  const history = (params.history ?? []).slice(-12).map((t) => ({ role: t.role, content: t.content }));

  try {
    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({
      model: VOICE_MODEL, // thoughtful, not latency-bound — the coach reasons over the record
      max_tokens: 700,
      system,
      messages: [...history, { role: 'user' as const, content: q }],
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return { ok: true, reply: reply || 'I couldn’t reach the film just now — ask me again in a moment.' };
  } catch {
    return { ok: true, reply: 'I couldn’t reach the film just now — ask me again in a moment.' };
  }
}
