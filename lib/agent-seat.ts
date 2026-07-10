import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { anthropicApiKey, SOLO_MODEL } from '@/lib/env';
import { postSeatMessage } from '@/lib/message-core';

// The AI-seat driver — the other half of the "one engine" seam. When a human messages
// a teammate seat cast as AI, that seat autonomously answers IN CHARACTER and delivers
// its reply back through the same `postSeatMessage` core (mirror + broadcast + a
// `message_sent` event from the AI seat's own participant). Same server capability
// family as the team `npc-reply` voice loop, but the occupant is a SEAT, not a contact:
// the reply is a first-class teammate message, indistinguishable in structure from a
// human's. Persona comes from the seat's `agent_json` (set at casting); a deterministic
// line covers a missing key so the engine never blocks the human's send.

async function complete(system: string, messages: Anthropic.MessageParam[], model: string, maxTokens: number): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({ model, max_tokens: maxTokens, system, messages });
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch {
    return null; // no key / model error → deterministic fallback
  }
}

/** Drive an AI-cast seat's reply to a message it just received from `toSeat`. */
export async function driveSeatReply(
  db: ReturnType<typeof createAdminClient>,
  params: {
    sessionId: string;
    scenarioId: string;
    companyName?: string;
    ai: { participantId: string; seat: { id: string; key: string }; agentJson: any };
    toSeat: { id: string; key: string }; // the human sender the AI answers
    incomingBody: string;
  },
): Promise<{ ok: boolean }> {
  const agent = params.ai.agentJson ?? {};

  // Seat identity (name/role) + persona for the character.
  const { data: seat } = await db.from('seats').select('name, role').eq('id', params.ai.seat.id).maybeSingle<any>();
  const name = agent.name ?? seat?.name ?? params.ai.seat.key;
  const role = agent.role ?? seat?.role ?? null;
  const persona: string = agent.persona ?? '';
  const priority: string = agent.priority ?? '';
  const model: string = agent.model ?? SOLO_MODEL;

  // Recent thread history between this AI seat and the human, for continuity.
  const { data: thread } = await db
    .from('threads')
    .select('id')
    .eq('session_id', params.sessionId)
    .eq('seat_id', params.ai.seat.id)
    .eq('contact_key', params.toSeat.key)
    .maybeSingle<any>();
  let history: Anthropic.MessageParam[] = [];
  if (thread) {
    const { data: msgs } = await db
      .from('messages')
      .select('sender, body, sent_at')
      .eq('thread_id', thread.id)
      .order('sent_at', { ascending: true });
    // In the AI seat's own thread: sender='me' → the AI's past turns; the human seat
    // key → the incoming turns. Map to assistant/user for the Messages API.
    history = (msgs ?? []).map((m: any) => ({
      role: m.sender === 'me' ? ('assistant' as const) : ('user' as const),
      content: String(m.body),
    }));
  }
  while (history.length && history[0]!.role === 'assistant') history.shift();
  if (history.length === 0) history = [{ role: 'user', content: params.incomingBody }];

  const system =
    `You are ${name}${role ? `, ${role}` : ''}${params.companyName ? ` at ${params.companyName}` : ''}, a member of a ` +
    `leadership team in a live crisis simulation.\n` +
    (persona ? `Your character: ${persona}\n` : '') +
    (priority ? `Your standing priority under pressure: ${priority}\n` : '') +
    `A teammate has just messaged you. Reply IN CHARACTER, first person, directly to them — ` +
    `2-4 sentences, concrete and human. This is a text message between colleagues: no narration, ` +
    `no stage directions, no markdown, no quotation marks. Advocate your own view honestly; you are ` +
    `one voice on the team, not the person who resolves the whole crisis. Never break character or ` +
    `mention that you are an AI.`;

  const raw = await complete(system, history, model, 320);
  const reply =
    (raw ?? '').trim().replace(/^["“]|["”]$/g, '') ||
    agent.fallbackReply ||
    `Got it — give me a moment and I'll come back to you with something concrete.`;

  const post = await postSeatMessage(db, {
    sessionId: params.sessionId,
    scenarioId: params.scenarioId,
    senderParticipantId: params.ai.participantId,
    senderSeat: params.ai.seat,
    contactKey: params.toSeat.key,
    body: reply,
    agent: true,
  });
  return { ok: post.ok };
}
