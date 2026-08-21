'use server';
import { authenticate, startAccountSession, createFacilitator, listFacilitators, setFacilitatorActive, setFacilitatorRole, changePassword, currentSessionToken, type FacilitatorListItem, type Role } from '@/lib/auth';
import { isAdmin, facilitator } from '@/lib/facilitator-session';

// Account auth actions (email + password). The legacy master-secret login stays in
// facilitator-actions (facilitatorLogin/Logout); these are the real-account paths.

/** Sign in with email + password. Opens an account session on success; returns the role so
 *  the client can route (leaders → play surface, staff → console). */
export async function accountLogin(email: string, password: string): Promise<{ ok: boolean; role?: Role }> {
  const f = await authenticate(email, password);
  if (!f) return { ok: false };
  await startAccountSession(f.id);
  return { ok: true, role: f.role };
}

/** Self-service: change your own password (real accounts only — the master key has none). */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; reason?: string }> {
  const me = await facilitator();
  if (!me) return { ok: false, reason: 'not_signed_in' };
  if (me.isMaster) return { ok: false, reason: 'master_no_password' };
  const keep = await currentSessionToken();
  return changePassword(me.id, currentPassword, newPassword, keep);
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

/** Change an account's role — facilitator ⇄ leader (player) ⇄ admin. Admin-only. You can't
 *  change your OWN role, so no admin can accidentally lock themselves out of the console (the
 *  master key is the escape hatch if that ever happens). */
export async function setAccountRole(id: string, role: Role): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden' };
  const me = await facilitator();
  if (me?.id === id) return { ok: false, reason: 'cant_change_own_role' };
  await setFacilitatorRole(id, role);
  return { ok: true };
}

/** Admin-only: list accounts. */
export async function listAccounts(): Promise<FacilitatorListItem[]> {
  if (!(await isAdmin())) return [];
  return listFacilitators();
}
