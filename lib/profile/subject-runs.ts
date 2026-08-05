import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Resolve a subject's human runs (participant + session + scenario) with SEPARATE queries.
// A nested `sessions!inner(scenarios!inner(...))` PostgREST embed was silently dropping valid
// runs (a relationship-detection quirk), so every profile surface resolves refs this way.

export interface SubjectRunRow {
  token: string;
  session: {
    id: string;
    status: string;
    run_config: any;
    started_at: string | null;
    scenario_id: string | null;
    scenario: { title: string } | null;
  };
}

export async function resolveSubjectRuns(db: ReturnType<typeof createAdminClient>, subjectId: string): Promise<SubjectRunRow[]> {
  const { data: parts } = await db.from('participants').select('token, session_id').eq('subject_id', subjectId).not('token', 'is', null);
  const partRows = (parts ?? []).filter((p: any) => p.session_id);
  if (!partRows.length) return [];

  const sessionIds = [...new Set(partRows.map((p: any) => p.session_id))];
  const { data: sessRows } = await db.from('sessions').select('id, status, run_config, started_at, scenario_id').in('id', sessionIds);
  const sessById = new Map<string, any>((sessRows ?? []).map((s: any) => [s.id, s]));

  const scnIds = [...new Set((sessRows ?? []).map((s: any) => s.scenario_id).filter(Boolean))];
  const titleBy = new Map<string, string>();
  if (scnIds.length) {
    const { data: scns } = await db.from('scenarios').select('id, title').in('id', scnIds);
    for (const sc of scns ?? []) titleBy.set((sc as any).id, (sc as any).title);
  }

  return partRows
    .map((p: any): SubjectRunRow | null => {
      const s = sessById.get(p.session_id);
      if (!s) return null;
      return {
        token: p.token,
        session: { id: s.id, status: s.status, run_config: s.run_config, started_at: s.started_at, scenario_id: s.scenario_id, scenario: { title: titleBy.get(s.scenario_id) ?? '—' } },
      };
    })
    .filter((x): x is SubjectRunRow => !!x);
}
