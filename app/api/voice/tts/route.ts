import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authParticipant } from '@/lib/participant-auth';
import { elevenLabsKey, TTS_MODEL } from '@/lib/env';

// POST /api/voice/tts  (handoff §7 — ElevenLabs proxy; key stays server-side)
//   { sessionId, participantId, token, contactKey, text }
// Resolves the contact's voice_id server-side and streams back audio/mpeg.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { sessionId, participantId, token, contactKey, text } = body ?? {};
  if (!sessionId || !participantId || !token || !contactKey || !text) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const db = createAdminClient();
  const auth = await authParticipant(db, { sessionId, participantId, token });
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: contact } = await db
    .from('contacts')
    .select('voice_id')
    .eq('scenario_id', auth.scenarioId)
    .eq('key', contactKey)
    .limit(1)
    .maybeSingle<{ voice_id: string | null }>();
  if (!contact?.voice_id) {
    return NextResponse.json({ error: 'no_voice_id' }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(contact.voice_id)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey(),
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({ text: String(text), model_id: TTS_MODEL }),
      },
    );
  } catch (e: any) {
    return NextResponse.json({ error: 'tts_fetch_failed', detail: String(e?.message ?? e) }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json({ error: 'tts_upstream_error', status: upstream.status, detail }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' },
  });
}
