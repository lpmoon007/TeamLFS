import 'server-only';
import { cookies } from 'next/headers';
import { facilitatorSecret } from '@/lib/env';

// Facilitator gate. The secret lives in an httpOnly cookie (never readable by client
// JS, unlike a bearer token the browser must hold). Minimal internal-tool auth — the
// proper facilitator identity layer (Supabase Auth + role) is a later hardening step.
const COOKIE = 'signal_fac';

export async function isFacilitatorSession(): Promise<boolean> {
  try {
    const v = (await cookies()).get(COOKIE)?.value;
    if (!v) return false;
    return v === facilitatorSecret();
  } catch {
    return false;
  }
}

export async function setFacilitatorSession(): Promise<void> {
  (await cookies()).set(COOKIE, facilitatorSecret(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function clearFacilitatorSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
