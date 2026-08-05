'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/facilitator-session';
import { buildSoloDebrief } from '@/lib/solo-debrief';

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

export interface MergePreview {
  groups: {
    handle: string;
    keepId: string;
    keepHandle: string;
    keepRuns: number;
    remove: { id: string; handle: string; runs: number; moves: number }[]; // moves = rows re-pointed
  }[];
  byTable: Record<string, number>; // rows to re-point per table, across all groups
  totalRemoved: number;
}

/** Read-only: exactly what a merge WOULD do — which profile is kept, which are removed, and how
 *  many rows in each table get re-pointed. No mutation. */
export async function previewMerge(): Promise<MergePreview> {
  if (!(await isAdmin())) return { groups: [], byTable: {}, totalRemoved: 0 };
  const db = createAdminClient();
  const groups = await findDuplicatePeople();
  const byTable: Record<string, number> = {};
  let totalRemoved = 0;
  const out: MergePreview['groups'] = [];

  for (const g of groups) {
    const keep = canonicalOf(g.subjects);
    const remove = g.subjects.filter((s) => s.id !== keep.id);
    const removeDetail = [];
    for (const d of remove) {
      let moves = 0;
      for (const table of SUBJECT_TABLES) {
        const { count } = await db.from(table).select('id', { count: 'exact', head: true }).eq('subject_id', d.id);
        const n = count ?? 0;
        moves += n;
        byTable[table] = (byTable[table] ?? 0) + n;
      }
      removeDetail.push({ id: d.id, handle: d.handle, runs: d.runs, moves });
      totalRemoved++;
    }
    out.push({ handle: keep.displayName || keep.handle, keepId: keep.id, keepHandle: keep.handle, keepRuns: keep.runs, remove: removeDetail });
  }
  return { groups: out, byTable, totalRemoved };
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
    // belt-and-suspenders: re-link by email so no participant can be left orphaned by the
    // delete's on-delete-set-null if a subject_id re-point missed.
    await relinkRunsByEmail(keep.id);
    details.push({ handle: keep.handle, keptRuns: keep.runs, removed: dupes.length });
  }

  return { ok: true, groups: groups.length, removed, details };
}

// ---- diagnostics -------------------------------------------------------------
export interface SubjectInspectRow {
  participantId: string;
  hasToken: boolean;
  castKind: string | null;
  sessionId: string;
  status: string;
  scenario: string;
  weekCount: number | null;
  debriefOk: boolean;
  debriefReason: string | null;
  overall: number | null;
  decisions: number | null; // weekly calls found — buildFingerprint needs decisions >= weekCount
  includedInFingerprint: boolean;
}
export interface SubjectInspect {
  subjectId: string;
  handle: string;
  displayName: string | null;
  otherSubjectsSameEmail: { id: string; handle: string; runs: number }[]; // should be empty after a clean merge
  panelRows: number;
  participants: SubjectInspectRow[];
  emailMatches: { id: string; subjectId: string | null; scenario: string; email: string | null; hasToken: boolean }[]; // participants whose email = this handle, regardless of subject — finds orphans
  orphanRuns: { participantId: string; name: string | null; scenario: string; status: string; overall: number | null }[]; // human runs with NO subject — claimable
}

/** Admin: dump the raw run picture for a subject — every participant, whether its token exists,
 *  whether the debrief builds, and how many weekly calls it has. Shows why a scored run may or
 *  may not appear in the fingerprint. Read-only. */
export async function inspectSubject(subjectId: string): Promise<SubjectInspect | null> {
  if (!(await isAdmin())) return null;
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id, handle, display_name').eq('id', subjectId).maybeSingle<any>();
  if (!subject) return null;

  const { data: parts } = await db
    .from('participants')
    .select('id, token, cast_kind, session:sessions!inner(id, status, scenario_id, scenario:scenarios!inner(title))')
    .eq('subject_id', subjectId);

  const scnIds = [...new Set((parts ?? []).map((p: any) => p.session?.scenario_id).filter(Boolean))];
  const weekBy = new Map<string, number>();
  if (scnIds.length) {
    const { data: metas } = await db.from('scenario_meta').select('scenario_id, week_count').in('scenario_id', scnIds);
    for (const m of metas ?? []) weekBy.set((m as any).scenario_id, (m as any).week_count ?? null as any);
  }

  const rows: SubjectInspectRow[] = [];
  for (const p of parts ?? []) {
    const s = (p as any).session;
    let debriefOk = false, debriefReason: string | null = null, overall: number | null = null, decisions: number | null = null;
    if ((p as any).token) {
      try {
        const d = await buildSoloDebrief(s.id, (p as any).token);
        if (d.ok) { debriefOk = true; overall = d.debrief.overall; decisions = d.debrief.gameFilm.filter((m) => m.type === 'decision').length; }
        else debriefReason = d.reason;
      } catch (e: any) { debriefReason = 'exception: ' + (e?.message ?? 'unknown'); }
    } else debriefReason = 'no token';
    const wc = weekBy.get(s.scenario_id) ?? null;
    const included = !!(p as any).token && debriefOk && (wc ? (decisions ?? 0) >= wc : overall !== null);
    rows.push({
      participantId: (p as any).id, hasToken: !!(p as any).token, castKind: (p as any).cast_kind ?? null,
      sessionId: s.id, status: s.status, scenario: s.scenario?.title ?? '—', weekCount: wc,
      debriefOk, debriefReason, overall, decisions, includedInFingerprint: included,
    });
  }

  const { count: panelRows } = await db.from('behavioral_panel').select('id', { count: 'exact', head: true }).eq('subject_id', subjectId);

  // any other subject still sharing the normalised email (a merge should have removed these)
  const { data: allSubs } = await db.from('subjects').select('id, handle');
  const key = norm(subject.handle);
  const others = (allSubs ?? []).filter((s: any) => s.id !== subjectId && norm(s.handle) === key);
  const otherIds = others.map((s: any) => s.id);
  const otherRuns = new Map<string, number>();
  if (otherIds.length) {
    const { data: op } = await db.from('participants').select('subject_id').in('subject_id', otherIds);
    for (const p of op ?? []) otherRuns.set((p as any).subject_id, (otherRuns.get((p as any).subject_id) ?? 0) + 1);
  }

  // participants whose email equals this handle, regardless of subject_id — surfaces orphans
  // (subject_id null) or mis-linked runs so we can re-attach them.
  const { data: em } = await db
    .from('participants')
    .select('id, subject_id, token, email, session:sessions(scenario:scenarios(title))')
    .ilike('email', subject.handle);
  const emailMatches = (em ?? []).map((p: any) => ({ id: p.id, subjectId: p.subject_id ?? null, scenario: p.session?.scenario?.title ?? '—', email: p.email ?? null, hasToken: !!p.token }));

  // orphaned human runs — a token but NO subject (e.g. nulled when a subject was deleted).
  // Claimable to any profile. Scored so the admin can identify the right one.
  const { data: orphans } = await db
    .from('participants')
    .select('id, name, token, session:sessions!inner(id, status, scenario:scenarios!inner(title))')
    .is('subject_id', null)
    .not('token', 'is', null)
    .limit(40);
  const orphanRuns: SubjectInspect['orphanRuns'] = [];
  for (const p of orphans ?? []) {
    const s = (p as any).session;
    let overall: number | null = null;
    try { const d = await buildSoloDebrief(s.id, (p as any).token); if (d.ok) overall = d.debrief.overall; } catch { /* ignore */ }
    orphanRuns.push({ participantId: (p as any).id, name: (p as any).name ?? null, scenario: s.scenario?.title ?? '—', status: s.status, overall });
  }

  return {
    subjectId, handle: subject.handle, displayName: subject.display_name ?? null,
    otherSubjectsSameEmail: others.map((s: any) => ({ id: s.id, handle: s.handle, runs: otherRuns.get(s.id) ?? 0 })),
    panelRows: panelRows ?? 0,
    participants: rows,
    emailMatches,
    orphanRuns,
  };
}

/** Attach a specific orphaned participant (a run with no subject) to a subject — and re-point
 *  its panel/profile rows. */
export async function attachParticipant(subjectId: string, participantId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden' };
  const db = createAdminClient();
  const { error } = await db.from('participants').update({ subject_id: subjectId }).eq('id', participantId);
  if (error) return { ok: false, reason: error.message };
  await db.from('behavioral_panel').update({ subject_id: subjectId }).eq('participant_id', participantId);
  await db.from('behavioral_profile').update({ subject_id: subjectId }).eq('participant_id', participantId);
  return { ok: true };
}

/** Repair: re-attach every participant whose email matches this subject's handle back to it —
 *  and re-point their panel/profile rows. Heals runs orphaned by a delete (subject_id nulled).
 *  Returns how many participants were re-linked. */
export async function relinkRunsByEmail(subjectId: string): Promise<{ ok: boolean; relinked: number; reason?: string }> {
  if (!(await isAdmin())) return { ok: false, relinked: 0, reason: 'forbidden' };
  const db = createAdminClient();
  const { data: subject } = await db.from('subjects').select('id, handle').eq('id', subjectId).maybeSingle<any>();
  if (!subject) return { ok: false, relinked: 0, reason: 'no_subject' };

  const { data: parts } = await db.from('participants').select('id, subject_id').ilike('email', subject.handle);
  const toFix = (parts ?? []).filter((p: any) => p.subject_id !== subjectId);
  const ids = toFix.map((p: any) => p.id);
  if (!ids.length) return { ok: true, relinked: 0 };

  await db.from('participants').update({ subject_id: subjectId }).in('id', ids);
  await db.from('behavioral_panel').update({ subject_id: subjectId }).in('participant_id', ids);
  await db.from('behavioral_profile').update({ subject_id: subjectId }).in('participant_id', ids);
  return { ok: true, relinked: ids.length };
}
