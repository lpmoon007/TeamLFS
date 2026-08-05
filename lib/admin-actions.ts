'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/facilitator-session';

// Admin data hygiene — find and consolidate DUPLICATE subjects (the same person split across
// more than one behavioral-memory profile). Splits happened when the spine keyed a subject on
// slug(email) while accounts/People keyed on the raw email — two rows for one person, so runs
// and the spine landed on one while the profile read the other. Merging re-points every
// subject_id table to a single canonical row, then removes the extras.

const norm = (h: string) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// every table that carries a subject_id, re-pointed on merge (trait_scores rides on
// participants, so it moves for free)
const SUBJECT_TABLES = ['participants', 'behavioral_profile', 'behavioral_panel', 'profile_claims', 'leadership_profiles', 'artifact_consents', 'preflight_decisions', 'challenges'];

export interface DupSubject { id: string; handle: string; displayName: string | null; runs: number; createdAt: string; hasEmail: boolean }
export interface DupGroup { key: string; subjects: DupSubject[] }

export async function findDuplicatePeople(): Promise<DupGroup[]> {
  if (!(await isAdmin())) return [];
  const db = createAdminClient();
  const { data: subs } = await db.from('subjects').select('id, handle, display_name, created_at');
  const rows = (subs ?? []) as any[];

  // group by normalised identity
  const groups = new Map<string, any[]>();
  for (const s of rows) {
    const k = norm(s.handle);
    if (!k) continue;
    let arr = groups.get(k);
    if (!arr) { arr = []; groups.set(k, arr); }
    arr.push(s);
  }
  const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  if (!dupGroups.length) return [];

  // run counts for the subjects involved
  const ids = dupGroups.flatMap(([, arr]) => arr.map((s) => s.id));
  const runs = new Map<string, number>();
  if (ids.length) {
    const { data: parts } = await db.from('participants').select('subject_id').in('subject_id', ids);
    for (const p of parts ?? []) runs.set((p as any).subject_id, (runs.get((p as any).subject_id) ?? 0) + 1);
  }

  return dupGroups.map(([key, arr]) => ({
    key,
    subjects: arr
      .map((s) => ({ id: s.id, handle: s.handle, displayName: s.display_name ?? null, runs: runs.get(s.id) ?? 0, createdAt: s.created_at, hasEmail: /@/.test(s.handle) }))
      .sort((a, b) => b.runs - a.runs),
  }));
}

/** Pick the canonical of a group: prefer the email-handle row (what the app keys on), then most
 *  runs, then oldest. */
function canonicalOf(subjects: DupSubject[]): DupSubject {
  return [...subjects].sort((a, b) => Number(b.hasEmail) - Number(a.hasEmail) || b.runs - a.runs || a.createdAt.localeCompare(b.createdAt))[0];
}

export async function mergeDuplicatePeople(): Promise<{ ok: boolean; reason?: string; groups: number; removed: number; details: { handle: string; keptRuns: number; removed: number }[] }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden', groups: 0, removed: 0, details: [] };
  const db = createAdminClient();
  const groups = await findDuplicatePeople();
  let removed = 0;
  const details: { handle: string; keptRuns: number; removed: number }[] = [];

  for (const g of groups) {
    const keep = canonicalOf(g.subjects);
    const dupes = g.subjects.filter((s) => s.id !== keep.id);
    for (const d of dupes) {
      for (const table of SUBJECT_TABLES) {
        await db.from(table).update({ subject_id: keep.id }).eq('subject_id', d.id);
      }
      await db.from('subjects').delete().eq('id', d.id);
      removed++;
    }
    details.push({ handle: keep.handle, keptRuns: keep.runs, removed: dupes.length });
  }

  return { ok: true, groups: groups.length, removed, details };
}
