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

// The exact email a handle represents (lowercased/trimmed), or null for a name-slug handle.
// Two DISTINCT emails are two different people — even if norm() collapses them (it strips dots
// and @, so j.carter@x.com and jcarter@x.com would otherwise look identical). We compare on
// this, never on norm(), when deciding what is safe to delete.
const emailOf = (h: string): string | null => (/@/.test(h) ? String(h).trim().toLowerCase() : null);

// every table that carries a subject_id, re-pointed on merge (trait_scores rides on
// participants, so it moves for free)
const SUBJECT_TABLES = ['participants', 'behavioral_profile', 'behavioral_panel', 'profile_claims', 'leadership_profiles', 'artifact_consents', 'preflight_decisions', 'challenges'];

export interface DupSubject { id: string; handle: string; displayName: string | null; runs: number; createdAt: string; hasEmail: boolean }
// safe=false means the group collided under norm() but holds two or more DIFFERENT real emails
// (or otherwise can't be proven one identity). Those are never auto-merged — a wrong merge
// hard-deletes a real person's profile — they surface for manual review instead.
export interface DupGroup { key: string; subjects: DupSubject[]; emails: string[]; safe: boolean }

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

  return dupGroups.map(([key, arr]) => {
    const subjects = arr
      .map((s) => ({ id: s.id, handle: s.handle, displayName: s.display_name ?? null, runs: runs.get(s.id) ?? 0, createdAt: s.created_at, hasEmail: /@/.test(s.handle) }))
      .sort((a, b) => b.runs - a.runs);
    const emails = [...new Set(subjects.map((s) => emailOf(s.handle)).filter((e): e is string => !!e))];
    // safe only when the group represents at most one real email: the email row plus its
    // slug variants. Two different emails colliding under norm() are different people.
    const safe = emails.length <= 1;
    return { key, subjects, emails, safe };
  });
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
  needsReview: { emails: string[]; subjects: { handle: string; runs: number }[] }[]; // collided but different emails — NOT merged
  byTable: Record<string, number>; // rows to re-point per table, across all groups
  totalRemoved: number;
}

/** Read-only: exactly what a merge WOULD do — which profile is kept, which are removed, and how
 *  many rows in each table get re-pointed. No mutation. Groups holding two different emails are
 *  listed under needsReview and never merged. */
export async function previewMerge(): Promise<MergePreview> {
  if (!(await isAdmin())) return { groups: [], needsReview: [], byTable: {}, totalRemoved: 0 };
  const db = createAdminClient();
  const all = await findDuplicatePeople();
  const byTable: Record<string, number> = {};
  let totalRemoved = 0;
  const out: MergePreview['groups'] = [];
  const needsReview: MergePreview['needsReview'] = [];

  for (const g of all) {
    if (!g.safe) {
      needsReview.push({ emails: g.emails, subjects: g.subjects.map((s) => ({ handle: s.handle, runs: s.runs })) });
      continue;
    }
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
  return { groups: out, needsReview, byTable, totalRemoved };
}

export async function mergeDuplicatePeople(): Promise<{ ok: boolean; reason?: string; groups: number; removed: number; skipped: number; details: { handle: string; keptRuns: number; removed: number }[] }> {
  if (!(await isAdmin())) return { ok: false, reason: 'forbidden', groups: 0, removed: 0, skipped: 0, details: [] };
  const db = createAdminClient();
  const all = await findDuplicatePeople();
  const groups = all.filter((g) => g.safe); // never auto-merge a group with two different emails
  const skipped = all.length - groups.length;
  let removed = 0;
  const details: { handle: string; keptRuns: number; removed: number }[] = [];

  for (const g of groups) {
    const keep = canonicalOf(g.subjects);
    const keepEmail = emailOf(keep.handle);
    const dupes = g.subjects.filter((s) => s.id !== keep.id);
    let removedHere = 0;
    for (const d of dupes) {
      // hard guard: never delete a subject that carries a DIFFERENT real email than the one
      // we're keeping — that would be deleting a different person. (Belt to the group-level
      // safe check's suspenders.)
      const dEmail = emailOf(d.handle);
      if (dEmail && keepEmail && dEmail !== keepEmail) continue;
      for (const table of SUBJECT_TABLES) {
        await db.from(table).update({ subject_id: keep.id }).eq('subject_id', d.id);
      }
      await db.from('subjects').delete().eq('id', d.id);
      removed++; removedHere++;
    }
    // belt-and-suspenders: re-link by email so no participant can be left orphaned by the
    // delete's on-delete-set-null if a subject_id re-point missed.
    await relinkRunsByEmail(keep.id);
    details.push({ handle: keep.handle, keptRuns: keep.runs, removed: removedHere });
  }

  return { ok: true, groups: groups.length, removed, skipped, details };
}

// ---- diagnostics -------------------------------------------------------------
export interface SubjectInspectRow {
  participantId: string;
  hasToken: boolean;
  castKind: string | null;
  sessionId: string | null;
  scenarioId: string | null;
  scenarioExists: boolean; // false = dangling scenario ref (the inner-join killer)
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

  // LEFT joins only — an inner join through a dangling scenario ref silently hides the run
  // (which is exactly the bug), so fetch raw and resolve each reference ourselves.
  const { data: parts } = await db.from('participants').select('id, token, cast_kind, session_id').eq('subject_id', subjectId);

  const rows: SubjectInspectRow[] = [];
  for (const p of parts ?? []) {
    const sessionId: string | null = (p as any).session_id ?? null;
    let status = '—', scenarioId: string | null = null, scenario = '—', scenarioExists = false, weekCount: number | null = null;
    if (sessionId) {
      const { data: sess } = await db.from('sessions').select('id, status, scenario_id').eq('id', sessionId).maybeSingle<any>();
      status = sess?.status ?? '(session missing)';
      scenarioId = sess?.scenario_id ?? null;
      if (scenarioId) {
        const { data: sc } = await db.from('scenarios').select('title').eq('id', scenarioId).maybeSingle<any>();
        scenarioExists = !!sc;
        scenario = sc?.title ?? '(scenario MISSING)';
        const { data: meta } = await db.from('scenario_meta').select('week_count').eq('scenario_id', scenarioId).maybeSingle<any>();
        weekCount = meta?.week_count ?? null;
      } else scenario = '(no scenario_id on session)';
    } else status = '(no session_id)';

    let debriefOk = false, debriefReason: string | null = null, overall: number | null = null, decisions: number | null = null;
    if ((p as any).token && sessionId) {
      try {
        const d = await buildSoloDebrief(sessionId, (p as any).token);
        if (d.ok) { debriefOk = true; overall = d.debrief.overall; decisions = d.debrief.gameFilm.filter((m) => m.type === 'decision').length; }
        else debriefReason = d.reason;
      } catch (e: any) { debriefReason = 'exception: ' + (e?.message ?? 'unknown'); }
    } else debriefReason = (p as any).token ? 'no session' : 'no token';
    const included = !!(p as any).token && debriefOk && (weekCount ? (decisions ?? 0) >= weekCount : overall !== null);
    rows.push({
      participantId: (p as any).id, hasToken: !!(p as any).token, castKind: (p as any).cast_kind ?? null,
      sessionId, scenarioId, scenarioExists, status, scenario, weekCount,
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
    .select('id, name, token, session:sessions(id, status, scenario:scenarios(title))')
    .is('subject_id', null)
    .not('token', 'is', null)
    .limit(40);
  const orphanRuns: SubjectInspect['orphanRuns'] = [];
  for (const p of orphans ?? []) {
    const s = (p as any).session;
    if (!s?.id) continue;
    let overall: number | null = null;
    try { const d = await buildSoloDebrief(s.id, (p as any).token); if (d.ok) overall = d.debrief.overall; } catch { /* ignore */ }
    orphanRuns.push({ participantId: (p as any).id, name: (p as any).name ?? null, scenario: s.scenario?.title ?? '(scenario missing)', status: s.status, overall });
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
