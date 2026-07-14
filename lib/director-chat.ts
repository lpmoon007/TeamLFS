'use server';
import Anthropic from '@anthropic-ai/sdk';
import { anthropicApiKey, VOICE_MODEL } from '@/lib/env';
import { buildSoloDebrief, buildSoloDebriefForFacilitator, type SoloDebrief } from '@/lib/solo-debrief';
import { isFacilitatorSession } from '@/lib/facilitator-session';
import { buildDebrief, type Debrief } from '@/lib/debrief';
import { buildTeamPanel } from '@/lib/team-panel';
import type { TeamMetricsResult } from '@/lib/team-metrics';

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
  const panelLines = d.panel
    ? d.panel.markers
        .map((m) =>
          m.exercised && m.normalized !== null
            ? `- ${m.label} (${m.key}): ${m.normalized}/100 [${m.confidence} confidence]`
            : `- ${m.label} (${m.key}): not exercised — this crisis never gave you the opening to show it (do not treat as a low score)`,
        )
        .join('\n')
    : '';

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
    (panelLines
      ? `\n=== THE PANEL — Tier A executive-judgment vitals (panel-v0.1) ===\n` +
        `Tier A composite: ${d.panel?.tierA ?? '—'}/100. These are RATES over the openings this scenario offered, ` +
        `normalized for difficulty — so they compare across scenarios where the raw score cannot. Tier B (teaming) is n/a ` +
        `in a solo run. When a marker is "not exercised", say so plainly — never fold it into a criticism.\n${panelLines}\n`
      : '') +
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

// ---- Team Director (the room, not the individual) -----------------------------
// Same head-coach, pointed at a team session. Grounded in the communication map + the
// Tier-B board (airtime / resilience / coverage / safety) and their raw evidence — so
// "why did resilience read low?" gets a specific answer, not a platitude (Team Event-Log
// Spec §4). Facilitator-gated (the team debrief is a facilitator surface).

function buildTeamContext(d: Debrief, panel: TeamMetricsResult | null): string {
  const persona =
    `You are the Director — the AI that ran and watched this TEAM crisis simulation. You are debriefing the facilitator ` +
    `about how the ROOM performed as one unit — not any single person's score, but the team-level properties that only ` +
    `exist between people. You have the complete record below: who spoke to whom, what was surfaced vs siloed, and the ` +
    `four team vitals with their raw evidence. Ground every answer in specifics — name the seat, the moment, the number. ` +
    `Never invent an event not in the record. When a vital reads "not yet instrumented", say the room didn't produce the ` +
    `signal for it — never treat that as a low score. Be direct and concrete. Keep answers to 2-4 short paragraphs.`;

  const parts = d.participants
    .map((p) => `- ${p.name}${p.role ? ` (${p.role})` : ''} [${p.flag}] — sent ${p.counts.sent}, first move ${p.firstMessageTo ? `→ ${p.firstMessageTo.target}` : 'never messaged'}${p.counts.omissions ? `, ${p.counts.omissions} omissions` : ''}`)
    .join('\n');
  const edges = d.team.blueEdges.length ? d.team.blueEdges.map((e) => `- ${e.from} → ${e.to} (${e.count})`).join('\n') : '- (no directed conversations on record)';
  const silos = d.team.unaddressed.length
    ? d.team.unaddressed.map((u) => `- ${u.seat} left "${u.contact ?? 'a thread'}" unaddressed${u.preview ? `: “${u.preview}”` : ''}`).join('\n')
    : '- Nothing flagged unaddressed.';

  let vitals = '';
  if (panel) {
    vitals =
      `\n=== THE TEAM VITALS (Tier B · panel-v0.1) — collective health index ${panel.healthIndex ?? '—'}/100 ===\n` +
      Object.values(panel.metrics)
        .map((m) => {
          if (!m.exercised || m.score === null) return `- ${m.label}: not yet instrumented — ${strip(m.note)}`;
          const ev = m.evidence ?? {};
          let e = '';
          if (m.key === 'airtime' && Array.isArray(ev.shares)) e = ` [shares: ${ev.shares.map((s: any) => `${s.seat} ${Math.round(s.share * 100)}%`).join(', ')}; Gini ${ev.gini}]`;
          else if (m.key === 'resilience' && Array.isArray(ev.episodes)) e = ` [${ev.episodes.length} stress episode(s); options considered: ${ev.episodes.map((x: any) => x.considered).join('/')}]`;
          else if (m.key === 'coverage') e = ` [${ev.surfaced}/${ev.total} surfaced in time; ${ev.pulled} pulled, ${ev.volunteered} volunteered]`;
          else if (m.key === 'safety') e = ` [dissent first-third ${ev.firstThird} → last-third ${ev.lastThird}, slope ${ev.slope}]`;
          return `- ${m.label}: ${m.score}/100 — ${strip(m.note)}${e}`;
        })
        .join('\n') +
      `\n${panel.mixedRoom ? 'NOTE: this room mixed human and AI-cast seats — AI seats are excluded from airtime and safety.\n' : ''}`;
  }

  return (
    `${persona}\n\n` +
    `=== SESSION ===\n${d.scenario?.title ?? 'Session'} · ${d.participants.length} participants · status ${d.session.status}\n` +
    `\n=== THE ROOM ===\n${parts}\n` +
    `\n=== WHO SPOKE TO WHOM (directed) ===\n${edges}\n` +
    `\n=== WHAT WAS KNOWN BUT NOT SURFACED ===\n${silos}\n` +
    vitals +
    `\n=== END OF RECORD ===`
  );
}

/** Ask the Team Director about the room. Facilitator-gated. */
export async function askTeamDirector(params: { sessionId: string; history: ChatTurn[]; question: string }): Promise<DirectorReply> {
  const q = params.question.trim();
  if (!q) return { ok: false };
  if (!(await isFacilitatorSession())) return { ok: false };

  const d = await buildDebrief(params.sessionId);
  if (!d) return { ok: false };
  const panel = await buildTeamPanel(params.sessionId);

  const system = buildTeamContext(d, panel);
  const history = (params.history ?? []).slice(-12).map((t) => ({ role: t.role, content: t.content }));
  try {
    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({ model: VOICE_MODEL, max_tokens: 700, system, messages: [...history, { role: 'user' as const, content: q }] });
    const reply = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
    return { ok: true, reply: reply || 'I couldn’t reach the film just now — ask me again in a moment.' };
  } catch {
    return { ok: true, reply: 'I couldn’t reach the film just now — ask me again in a moment.' };
  }
}
