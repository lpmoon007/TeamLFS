import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Read side of the 30-day rep. The header CTA and the profile section both need the current
// commitment's state — none / committed / complete — resolved by subject.

export interface RepRow {
  id: string;
  repText: string;
  targetMarker: string;
  obstacle: string | null;
  committedAt: string;
  status: string; // committed | complete | abandoned
  daysLogged: number | null;
  outcome: string | null; // kept | partial | not_kept
}

/** The leader's most recent rep commitment, or null if they've never committed one. */
export async function getRepState(subjectId: string): Promise<RepRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('rep_commitments')
    .select('*')
    .eq('subject_id', subjectId)
    .order('committed_at', { ascending: false })
    .limit(1)
    .maybeSingle<any>();
  if (!data) return null;
  return {
    id: data.id,
    repText: data.rep_text,
    targetMarker: data.target_marker,
    obstacle: data.obstacle ?? null,
    committedAt: data.committed_at,
    status: data.status ?? 'committed',
    daysLogged: data.days_logged ?? null,
    outcome: data.outcome ?? null,
  };
}

/** Days since a commitment (1-based, capped at 30) — for the "day N of 30" CTA. */
export function repDay(committedAt: string, now: Date): number {
  const then = new Date(committedAt).getTime();
  const days = Math.floor((now.getTime() - then) / 86_400_000) + 1;
  return Math.max(1, Math.min(30, days));
}
