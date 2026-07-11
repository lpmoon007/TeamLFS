import 'server-only';
import { facilitatorSecret, cronSecret } from '@/lib/env';

// Length-guarded constant-time-ish compare.
function safeEqual(provided: string, expected: string): boolean {
  if (!expected || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function bearer(req: Request): string | null {
  const m = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1]!.trim() : null;
}

// Bearer-token guard for the facilitator/automation endpoints. The same secret is used
// by a human firing injects manually and by the app's own tooling.
export function isFacilitator(req: Request): boolean {
  const provided = bearer(req);
  if (!provided) return false;
  let expected: string;
  try {
    expected = facilitatorSecret();
  } catch {
    return false;
  }
  return safeEqual(provided, expected);
}

// Guard for Vercel Cron invocations. Vercel sends `Authorization: Bearer <CRON_SECRET>`
// on scheduled hits; we accept that, and fall back to the facilitator secret so the
// same route can be triggered manually. No external scheduler (make.com) is used.
export function isCron(req: Request): boolean {
  const provided = bearer(req);
  if (!provided) return false;
  if (safeEqual(provided, cronSecret())) return true;
  try {
    return safeEqual(provided, facilitatorSecret());
  } catch {
    return false;
  }
}
