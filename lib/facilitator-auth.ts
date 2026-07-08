import 'server-only';
import { facilitatorSecret } from '@/lib/env';

// Bearer-token guard for the facilitator/automation endpoints. The same secret is
// used by a human firing injects manually now and by make.com on a schedule later.
export function isFacilitator(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const provided = m[1]!.trim();
  let expected: string;
  try {
    expected = facilitatorSecret();
  } catch {
    return false;
  }
  // Length-guarded constant-time-ish compare.
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
