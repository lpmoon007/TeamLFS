import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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

/** A play-only leader account (no console access). */
export async function isLeader(): Promise<boolean> {
  const f = await currentFacilitator();
  return f?.role === 'leader';
}

/** Console staff — admin or facilitator (NOT a play-only leader). This is the real gate for
 *  every facilitator surface and data action. */
export async function isStaff(): Promise<boolean> {
  const f = await currentFacilitator();
  return f?.role === 'admin' || f?.role === 'facilitator';
}

/** Page gate for console routes: returns 'ok' for staff, redirects leaders to their play
 *  surface, and returns 'login' for anonymous (the caller renders the sign-in screen). */
export async function requireStaffPage(): Promise<'ok' | 'login'> {
  const f = await currentFacilitator();
  if (!f) return 'login';
  if (f.role === 'leader') redirect('/play');
  return 'ok';
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
  if (await isStaff()) return true; // staff only — a play-only leader can't reach console views
  if (!key) return false;
  try {
    return key === facilitatorSecret();
  } catch {
    return false;
  }
}
