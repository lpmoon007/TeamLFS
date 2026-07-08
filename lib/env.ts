// Centralized env access. Server-only secrets must never reach the client bundle,
// so SUPABASE_SERVICE_ROLE is read lazily inside server-only modules.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

/** Server-only. Throws if read in a context where it is missing. */
export function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE ?? '';
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE is not set. The participant read path resolves the ' +
        'magic-link token server-side and requires the service role key.',
    );
  }
  return key;
}

/** Server-only AI/voice keys (handoff §7 — kept server-side). */
export function anthropicApiKey(): string {
  const k = process.env.ANTHROPIC_API_KEY ?? '';
  if (!k) throw new Error('ANTHROPIC_API_KEY is not set (required for npc-reply).');
  return k;
}
export function elevenLabsKey(): string {
  const k = process.env.ELEVENLABS_KEY ?? '';
  if (!k) throw new Error('ELEVENLABS_KEY is not set (required for tts).');
  return k;
}
/** NPC reply model — defaults to Claude Opus 4.8; override for latency/cost. */
export const VOICE_MODEL = process.env.VOICE_MODEL ?? 'claude-opus-4-8';
/** ElevenLabs TTS model — turbo for low latency by default. */
export const TTS_MODEL = process.env.ELEVENLABS_MODEL ?? 'eleven_turbo_v2_5';

/** Server-only shared secret guarding the facilitator/automation endpoints (§5). */
export function facilitatorSecret(): string {
  const s = process.env.FACILITATOR_SECRET ?? '';
  if (!s) {
    throw new Error(
      'FACILITATOR_SECRET is not set. The facilitator/make.com inject endpoints require it.',
    );
  }
  return s;
}

export function assertPublicEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in your Supabase project values.',
    );
  }
}
