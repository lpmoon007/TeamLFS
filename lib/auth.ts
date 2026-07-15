import 'server-only';
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { facilitatorSecret } from '@/lib/env';

// Facilitator/admin account layer. App-managed (not Supabase Auth) so it's fully
// self-contained + testable: salted scrypt passwords, opaque revocable DB sessions, roles.
// The legacy FACILITATOR_SECRET remains a bootstrap master key (synthetic admin identity)
// so an operator can always get in to create the first real account.

const SESSION_COOKIE = 'signal_fac_sess'; // account session token
const SECRET_COOKIE = 'signal_fac'; // legacy shared-secret cookie (bootstrap master)
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export type Role = 'admin' | 'facilitator';
export interface Facilitator {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  orgId: string | null;
  isMaster?: boolean; // true for the legacy secret identity (no DB row)
}

// ---- password hashing (scrypt, built-in) --------------------------------------
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${dk.toString('hex')}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const parts = String(stored).split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const dk = scryptSync(pw, Buffer.from(parts[1], 'hex'), 64);
    const expected = Buffer.from(parts[2], 'hex');
    return expected.length === dk.length && timingSafeEqual(expected, dk);
  } catch {
    return false;
  }
}

const normEmail = (e: string) => e.trim().toLowerCase();

type Db = ReturnType<typeof createAdminClient>;

function rowToFacilitator(r: any): Facilitator {
  return { id: r.id, email: r.email, displayName: r.display_name ?? null, role: (r.role as Role) ?? 'facilitator', orgId: r.org_id ?? null };
}

// ---- accounts -----------------------------------------------------------------

/** Create an account. Fails on duplicate email or weak input. */
export async function createFacilitator(params: { email: string; password: string; displayName?: string; role?: Role; orgId?: string | null }): Promise<{ ok: boolean; reason?: string; id?: string }> {
  const email = normEmail(params.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, reason: 'invalid_email' };
  if (!params.password || params.password.length < 8) return { ok: false, reason: 'weak_password' };
  const db = createAdminClient();
  const { data: existing } = await db.from('facilitators').select('id').eq('email', email).maybeSingle<any>();
  if (existing) return { ok: false, reason: 'email_taken' };
  const { data, error } = await db
    .from('facilitators')
    .insert({ email, password_hash: hashPassword(params.password), display_name: params.displayName?.trim() || null, role: params.role === 'admin' ? 'admin' : 'facilitator', org_id: params.orgId ?? null })
    .select('id')
    .single<any>();
  if (error || !data) return { ok: false, reason: error?.message ?? 'insert_failed' };
  return { ok: true, id: data.id };
}

/** Verify credentials; returns the account or null. */
export async function authenticate(email: string, password: string): Promise<Facilitator | null> {
  const db = createAdminClient();
  const { data } = await db.from('facilitators').select('id, email, display_name, role, org_id, password_hash, active').eq('email', normEmail(email)).maybeSingle<any>();
  if (!data || !data.active) return null;
  if (!verifyPassword(password, data.password_hash)) return null;
  await db.from('facilitators').update({ last_login_at: new Date().toISOString() }).eq('id', data.id);
  return rowToFacilitator(data);
}

// ---- sessions -----------------------------------------------------------------

/** Open a session for an authenticated account (sets the cookie). */
export async function startAccountSession(facilitatorId: string): Promise<void> {
  const db = createAdminClient();
  const token = (randomUUID() + randomUUID()).replace(/-/g, '');
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.from('facilitator_sessions').insert({ token, facilitator_id: facilitatorId, expires_at: expires });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: Math.floor(SESSION_TTL_MS / 1000) });
}

/** Resolve the current account from the session cookie, else the legacy master secret. */
export async function currentFacilitator(): Promise<Facilitator | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = createAdminClient();
    const { data } = await db
      .from('facilitator_sessions')
      .select('expires_at, facilitator:facilitators!inner(id, email, display_name, role, org_id, active)')
      .eq('token', token)
      .maybeSingle<any>();
    if (data && data.facilitator?.active && new Date(data.expires_at).getTime() > Date.now()) {
      return rowToFacilitator(data.facilitator);
    }
  }
  // legacy bootstrap: the shared secret cookie is a synthetic master admin
  const secretCookie = jar.get(SECRET_COOKIE)?.value;
  if (secretCookie) {
    try {
      if (secretCookie === facilitatorSecret()) {
        return { id: 'master', email: 'master@local', displayName: 'Master (secret key)', role: 'admin', orgId: null, isMaster: true };
      }
    } catch {
      /* no secret configured */
    }
  }
  return null;
}

/** Sign out — revoke the DB session + clear both cookies. */
export async function endAccountSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await createAdminClient().from('facilitator_sessions').delete().eq('token', token);
    } catch {
      /* best-effort */
    }
    jar.delete(SESSION_COOKIE);
  }
  jar.delete(SECRET_COOKIE);
}

// ---- admin management ---------------------------------------------------------

export interface FacilitatorListItem extends Facilitator {
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
export async function listFacilitators(): Promise<FacilitatorListItem[]> {
  const db: Db = createAdminClient();
  const { data } = await db.from('facilitators').select('id, email, display_name, role, org_id, active, created_at, last_login_at').order('created_at', { ascending: true });
  return (data ?? []).map((r: any) => ({ ...rowToFacilitator(r), active: !!r.active, createdAt: r.created_at, lastLoginAt: r.last_login_at ?? null }));
}
export async function setFacilitatorActive(id: string, active: boolean): Promise<void> {
  const db = createAdminClient();
  await db.from('facilitators').update({ active }).eq('id', id);
  if (!active) await db.from('facilitator_sessions').delete().eq('facilitator_id', id); // revoke live sessions
}
export async function countFacilitators(): Promise<number> {
  const { count } = await createAdminClient().from('facilitators').select('id', { count: 'exact', head: true });
  return count ?? 0;
}
