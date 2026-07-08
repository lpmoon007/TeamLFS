import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { authParticipant } from '@/lib/participant-auth';
import { anthropicApiKey, VOICE_MODEL } from '@/lib/env';

// POST /api/voice/npc-reply  (handoff §7 — the in-character call loop, server-side)
//   { sessionId, participantId, token, callId, contactKey, userText }
//
// persona (contacts.persona) + recent call_turns → Claude → the NPC's next spoken
// line. Records both the participant's utterance and the NPC's reply as call_turns
// and logs call_turn events (Layer 1). The client then sends the text to /tts.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { sessionId, participantId, token, callId, contactKey, userText } = body ?? {};
  if (!sessionId || !participantId || !token || !callId || !contactKey) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const db = createAdminClient();
  const auth = await authParticipant(db, { sessionId, participantId, token });
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Confirm the call belongs to this seat.
  const { data: call } = await db
    .from('calls')
    .select('id')
    .eq('id', callId)
    .eq('seat_id', auth.seatId)
    .maybeSingle<{ id: string }>();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });

  const { data: contact } = await db
    .from('contacts')
    .select('full, role, persona, opener')
    .eq('scenario_id', auth.scenarioId)
    .eq('key', contactKey)
    .limit(1)
    .maybeSingle<{ full: string; role: string | null; persona: string | null; opener: string | null }>();
  if (!contact) return NextResponse.json({ error: 'contact_not_found' }, { status: 404 });

  const utterance = String(userText ?? '').trim();

  // Record the participant's utterance first (turn + event).
  if (utterance) {
    await db.from('call_turns').insert({ call_id: callId, who: 'me', text: utterance });
    await db.from('events').insert({
      session_id: sessionId,
      participant_id: participantId,
      seat_id: auth.seatId,
      type: 'call_turn',
      channel: 'call',
      target: contactKey,
      payload_json: { who: 'me', text: utterance, call_id: callId },
    });
  }

  // Recent transcript for context (chronological).
  const { data: turns } = await db
    .from('call_turns')
    .select('who, text, at')
    .eq('call_id', callId)
    .order('at', { ascending: true });

  const history = (turns ?? []).map((t: any) => ({
    role: t.who === 'me' ? ('user' as const) : ('assistant' as const),
    content: t.text as string,
  }));
  // Ensure the conversation starts with a user turn for the Messages API.
  while (history.length && history[0]!.role === 'assistant') history.shift();
  if (history.length === 0) {
    history.push({ role: 'user', content: '[The line connects. The caller is waiting for you to speak.]' });
  }

  const system =
    `You are ${contact.full}${contact.role ? `, ${contact.role}` : ''}, speaking on a phone call ` +
    `in a live leadership simulation.\n\n${contact.persona ?? ''}\n\n` +
    `Stay fully in character. This is spoken dialogue: reply with ONLY the words you say ` +
    `out loud — no narration, no stage directions, no markdown, no quotation marks. Keep it ` +
    `to 1–3 natural sentences. Do not break character or mention that you are an AI.`;

  let text = '';
  try {
    const client = new Anthropic({ apiKey: anthropicApiKey() });
    const msg = await client.messages.create({
      model: VOICE_MODEL,
      max_tokens: 300,
      system,
      messages: history,
    });
    text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch (e: any) {
    return NextResponse.json({ error: 'llm_error', detail: String(e?.message ?? e) }, { status: 502 });
  }

  if (!text) text = '…';

  // Record the NPC reply (turn + event).
  await db.from('call_turns').insert({ call_id: callId, who: 'them', text });
  await db.from('events').insert({
    session_id: sessionId,
    participant_id: participantId,
    seat_id: auth.seatId,
    type: 'call_turn',
    channel: 'call',
    target: contactKey,
    payload_json: { who: 'them', text, call_id: callId },
  });

  return NextResponse.json({ text });
}
