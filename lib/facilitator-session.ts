import 'server-only';
import { cookies } from 'next/headers';
import { facilitatorSecret } from '@/lib/env';
import { currentFacilitator, endAccountSession, type Facilitator } from '@/lib/auth';

// Facilitator gate. Two ways in, both httpOnly-cookie based: a real account session
// (lib/auth) OR the legacy shared FACILITATOR_SECRET (bootstrap master key). The account
// layer is the real identity; the secret stays so an operator can always create the first
// admin and existing deploys keep working.
const COOKIE = 'signal_fac';

/** True if the request carries a valid account session OR the legacy master secret. */
export async function isFacilitatorSession(): Promise<boolean> {
  return (await currentFacilitator()) !== null;
}

/** The signed-in facilitator (real account or the synthetic master), or null. */
export async function facilitator(): Promise<Facilitator | null> {
  return currentFacilitator();
}

/** Admin-only gate (account management). The master secret counts as admin. */
export async function isAdmin(): Promise<boolean> {
  const f = await currentFacilitator();
  return f?.role === 'admin';
}

/** Legacy: set the shared-secret cookie (the master-key login path). */
export async function setFacilitatorSession(): Promise<void> {
  (await cookies()).set(COOKIE, facilitatorSecret(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function clearFacilitatorSession(): Promise<void> {
  await endAccountSession(); // revoke the account session + clear both cookies
}

// Allow either the facilitator cookie OR a ?key= that matches the secret (so debrief
// links are shareable with a coach who isn't signed in).
export async function facilitatorAllowed(key?: string): Promise<boolean> {
  if (await isFacilitatorSession()) return true;
  if (!key) return false;
  try {
    return key === facilitatorSecret();
  } catch {
    return false;
  }
}
