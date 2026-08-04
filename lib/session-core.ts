import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// The session-creation core — shared by the facilitator flow (createSession, staff-guarded)
// and the self-serve leader flow (startLeaderRun, leader-guarded). Lives here as a plain
// server-only helper (NOT a 'use server' action) so it can be reused without becoming an
// unguarded RPC endpoint. Every caller is responsible for its own authorization.

export interface SessionLink {
  seatKey: string;
  name: string;
  role: string | null;
  castKind: 'human' | 'ai';
  path: string | null; // magic-link path for human seats; null for AI-cast seats
}
export interface CreateSessionResult {
  ok: boolean;
  reason?: string;
  sessionId?: string;
  mode?: 'solo' | 'team';
  links?: SessionLink[];
}

export const newToken = () => (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');

export async function createSessionCore(
  db: ReturnType<typeof createAdminClient>,
  params: {
    scenarioId: string;
    disposition?: string;
    castAsTeam?: boolean;
    assignments?: { seatKey: string; subjectId: string }[]; // pre-link named people to seats
  },
): Promise<CreateSessionResult> {
  const { data: scenario } = await db.from('scenarios').select('id, title').eq('id', params.scenarioId).maybeSingle<any>();
  if (!scenario) return { ok: false, reason: 'scenario_not_found' };
  const { data: meta } = await db.from('scenario_meta').select('*').eq('scenario_id', params.scenarioId).maybeSingle<any>();
  const mode = (meta?.mode_default ?? 'team') as 'solo' | 'team';
  const contentVersion = Number(meta?.content_version ?? 1); // freeze the played-on version
  // team-cast only applies to a solo scenario (a team scenario is already all-human).
  const teamCast = mode === 'solo' && !!params.castAsTeam;

  const { data: seats } = await db.from('seats').select('id, key, name, role, meta').eq('scenario_id', params.scenarioId).order('key', { ascending: true });
  if (!seats || !seats.length) return { ok: false, reason: 'no_seats' };

  // roster assignment: pre-link a seat's participant to a person (subject) so their runs
  // attribute to the right cross-session profile and their name pre-fills.
  const assignBySeat = new Map<string, string>((params.assignments ?? []).map((a) => [a.seatKey, a.subjectId]));
  const subjectById = new Map<string, { display_name: string | null; handle: string }>();
  if (assignBySeat.size) {
    const { data: subs } = await db.from('subjects').select('id, display_name, handle').in('id', [...new Set(assignBySeat.values())]);
    for (const s of subs ?? []) subjectById.set((s as any).id, { display_name: (s as any).display_name, handle: (s as any).handle });
  }

  const run_config: Record<string, unknown> =
    mode === 'solo' ? { disposition: params.disposition ?? 'request', ...(teamCast ? { team_cast: true } : {}) } : {};
  const base = { scenario_id: params.scenarioId, status: 'live', started_at: new Date().toISOString(), run_config };
  let { data: session, error: sessErr } = await db.from('sessions').insert({ ...base, content_version: contentVersion }).select('id').single<any>();
  if (sessErr && /content_version/i.test(sessErr.message ?? '')) {
    // DB predates migration 0017 — create without the version stamp (apply 0017 to enable it).
    ({ data: session, error: sessErr } = await db.from('sessions').insert(base).select('id').single<any>());
  }
  if (sessErr || !session) {
    return { ok: false, reason: sessErr?.message ? `insert_failed: ${sessErr.message}` : 'insert_failed' };
  }
  const sessionId: string = session.id;

  const links: SessionLink[] = [];
  const rows = (seats as any[]).map((seat) => {
    // team (or team-cast solo): every seat is a human player. plain solo: the CEO hot seat
    // is human; the rest are AI-cast advisors (they reply through the engine — no link).
    const human = mode !== 'solo' || teamCast || seat.key === 'ceo';
    const token = human ? newToken() : null;
    const cast_kind = human ? 'human' : 'ai';
    const agent_json = human
      ? {}
      : { name: seat.name, role: seat.role ?? null, persona: seat.meta?.persona ?? null, priority: seat.meta?.priority ?? null, autonomy: 'reactive' };
    // team-cast solo still runs in the SOLO engine (/solo), just with N humans.
    const basePath = mode === 'solo' ? '/solo' : '/s';
    // assigned person (only meaningful for human seats): pre-link subject + name/email.
    const subjectId = human ? assignBySeat.get(seat.key) ?? null : null;
    const person = subjectId ? subjectById.get(subjectId) : null;
    const displayName = person?.display_name || seat.name;
    const email = person && /@/.test(person.handle) ? person.handle : null;
    links.push({
      seatKey: seat.key,
      name: displayName,
      role: seat.role ?? null,
      castKind: cast_kind as 'human' | 'ai',
      path: token ? `${basePath}/${sessionId}?t=${token}` : null,
    });
    return { session_id: sessionId, seat_id: seat.id, token, cast_kind, agent_json, name: displayName, email, subject_id: subjectId };
  });
  const { error: partErr } = await db.from('participants').insert(rows);
  if (partErr) return { ok: false, reason: `participants_failed: ${partErr.message}` };

  await db.from('events').insert({
    session_id: sessionId,
    type: 'session_created',
    channel: 'system',
    target: null,
    payload_json: { scenario: scenario.title, mode, team_cast: teamCast, seats: rows.length },
  });

  return { ok: true, sessionId, mode, links };
}
