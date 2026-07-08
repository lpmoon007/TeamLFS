import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiScoreSession, getRubric, type SpineEvent, type TraitScore } from '@/lib/scoring';

// Phase 7 — the debrief read. The capture log (events) IS the product's value; the
// debrief is its first read: a per-participant timeline, the single most diagnostic
// column ("who did each person message first"), response latencies, and the initial
// (hypothesis) trait scores. Everything here is a READ of Layer 1 — no new capture.

export interface DebriefEvent {
  id: string;
  type: string;
  channel: string | null;
  target: string | null;
  at: string;
  rel_ms: number; // ms since session start
  derived: boolean;
  preview: string | null;
}

export interface DebriefParticipant {
  participantId: string;
  seatKey: string;
  name: string;
  role: string | null;
  firstEvent: { type: string; rel_ms: number } | null;
  firstMessageTo: { target: string; rel_ms: number } | null;
  counts: { sent: number; opened: number; emailsRead: number; calls: number; omissions: number };
  latencyMs: { count: number; avg: number | null; max: number | null };
  timeline: DebriefEvent[];
  traits: Array<TraitScore & { definition: string | null; status: string | null }>;
}

export interface Debrief {
  session: { id: string; status: string; started_at: string | null; ended_at: string | null };
  scenario: { title: string } | null;
  startMs: number;
  participants: DebriefParticipant[];
  scorerNote: string;
}

const ACTIONABLE = new Set([
  'message_sent',
  'email_read',
  'doc_approved',
  'doc_returned',
  'doc_edited',
  'call_placed',
  'thread_opened',
  'brief_opened',
]);

export async function buildDebrief(sessionId: string): Promise<Debrief | null> {
  const db = createAdminClient();

  const { data: session } = await db
    .from('sessions')
    .select('id, scenario_id, status, started_at, ended_at')
    .eq('id', sessionId)
    .maybeSingle<any>();
  if (!session) return null;

  const { data: scenario } = await db
    .from('scenarios')
    .select('title')
    .eq('id', session.scenario_id)
    .maybeSingle<{ title: string }>();

  const { data: parts } = await db
    .from('participants')
    .select('id, seat:seats!inner(key, name, role)')
    .eq('session_id', sessionId);

  const { data: rawEvents } = await db
    .from('events')
    .select('id, session_id, participant_id, seat_id, ts, scenario_ms, type, channel, target, payload_json, derived')
    .eq('session_id', sessionId)
    .order('ts', { ascending: true });
  const events = (rawEvents ?? []) as SpineEvent[];

  // Session start = started_at, or the earliest event.
  const startMs = session.started_at
    ? new Date(session.started_at).getTime()
    : events.length
      ? new Date(events[0]!.ts).getTime()
      : 0;

  const byParticipant = new Map<string, SpineEvent[]>();
  for (const e of events) {
    if (!e.participant_id) continue;
    (byParticipant.get(e.participant_id) ?? byParticipant.set(e.participant_id, []).get(e.participant_id)!).push(e);
  }

  const participants: DebriefParticipant[] = [];
  for (const p of parts ?? []) {
    const pid = (p as any).id as string;
    const seat = (p as any).seat;
    const evs = byParticipant.get(pid) ?? [];

    const timeline: DebriefEvent[] = evs.map((e) => ({
      id: e.id,
      type: e.type,
      channel: e.channel,
      target: e.target,
      at: e.ts,
      rel_ms: new Date(e.ts).getTime() - startMs,
      derived: e.derived,
      preview: previewOf(e),
    }));

    const firstReal = evs.find((e) => !e.derived);
    const firstMsg = evs.find((e) => e.type === 'message_sent');

    // Response latencies: each inject_delivered → next actionable act by this person.
    const latencies: number[] = [];
    for (let i = 0; i < evs.length; i++) {
      if (evs[i]!.type !== 'inject_delivered') continue;
      const t0 = new Date(evs[i]!.ts).getTime();
      const next = evs.slice(i + 1).find((e) => ACTIONABLE.has(e.type));
      if (next) latencies.push(new Date(next.ts).getTime() - t0);
    }

    const traitScores = await aiScoreSession(events, { participantId: pid, sessionId });
    const traits = traitScores.map((t) => {
      const rubric = getRubric(t.trait_key, t.taxonomy_version);
      return { ...t, definition: rubric?.definition ?? null, status: rubric?.status ?? null };
    });

    participants.push({
      participantId: pid,
      seatKey: seat?.key,
      name: seat?.name ?? seat?.key,
      role: seat?.role ?? null,
      firstEvent: firstReal ? { type: firstReal.type, rel_ms: new Date(firstReal.ts).getTime() - startMs } : null,
      firstMessageTo: firstMsg
        ? { target: firstMsg.target ?? '(unknown)', rel_ms: new Date(firstMsg.ts).getTime() - startMs }
        : null,
      counts: {
        sent: evs.filter((e) => e.type === 'message_sent').length,
        opened: evs.filter((e) => e.type === 'thread_opened').length,
        emailsRead: evs.filter((e) => e.type === 'email_read').length,
        calls: evs.filter((e) => e.type === 'call_placed' || e.type === 'call_accepted').length,
        omissions: evs.filter((e) => e.derived).length,
      },
      latencyMs: {
        count: latencies.length,
        avg: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
        max: latencies.length ? Math.max(...latencies) : null,
      },
      timeline,
      traits,
    });
  }

  // Order by who moved first (earliest first real event).
  participants.sort((a, b) => (a.firstEvent?.rel_ms ?? Infinity) - (b.firstEvent?.rel_ms ?? Infinity));

  return {
    session: { id: session.id, status: session.status, started_at: session.started_at, ended_at: session.ended_at },
    scenario: scenario ?? null,
    startMs,
    participants,
    scorerNote:
      'Trait scores are v0.1 HYPOTHESIS heuristics, not validated diagnostics. They ' +
      'are shown to exercise the scoring pipeline (versioned, evidence-cited), and must ' +
      'not drive a client-facing claim until inter-rater reliability is measured.',
  };
}

function previewOf(e: SpineEvent): string | null {
  const p = e.payload_json as any;
  const body = p?.body ?? p?.text ?? p?.preview ?? p?.edited_text ?? null;
  return body ? String(body).slice(0, 120) : null;
}
