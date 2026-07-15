'use server';
import { authenticate, startAccountSession, createFacilitator, listFacilitators, setFacilitatorActive, type FacilitatorListItem, type Role } from '@/lib/auth';
import { isAdmin } from '@/lib/facilitator-session';

// Account auth actions (email + password). The legacy master-secret login stays in
// facilitator-actions (facilitatorLogin/Logout); these are the real-account paths.

/** Sign in with email + password. Opens an account session on success. */
export async function accountLogin(email: string, password: string): Promise<{ ok: boolean }> {
  const f = await authenticate(email, password);
  if (!f) return { ok: false };
  await startAccountSession(f.id);
  return { ok: true };
}

/** Admin-only: create a facilitator/admin account. */
export async function createAccount(params: { email: string; password: string; displayName?: string; role?: Role }): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden' };
  const res = await createFacilitator(params);
  return { ok: res.ok, reason: res.reason };
}

/** Admin-only: activate / deactivate an account (deactivating revokes live sessions). */
export async function setAccountActive(id: string, active: boolean): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden' };
  await setFacilitatorActive(id, active);
  return { ok: true };
}

/** Admin-only: list accounts. */
export async function listAccounts(): Promise<FacilitatorListItem[]> {
  if (!(await isAdmin())) return [];
  return listFacilitators();
}
