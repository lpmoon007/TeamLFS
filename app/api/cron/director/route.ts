import { NextResponse } from 'next/server';
import { isCron } from '@/lib/facilitator-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runDirector } from '@/lib/director';

// GET/POST /api/cron/director — the native scheduler seam (no make.com).
//
// Vercel Cron hits this on an interval (see vercel.json) with
// `Authorization: Bearer <CRON_SECRET>`. It finds every LIVE session whose Director is
// enabled (run_config.director.enabled) and runs one tick for each — releasing the
// beats whose moment has come, paced by the AI layer when that session has it on.
// Sessions with the Director off are skipped (manual/scripted firing stands).
export const dynamic = 'force-dynamic';

async function handle(req: Request) {
  if (!isCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: sessions } = await db
    .from('sessions')
    .select('id, run_config')
    .eq('status', 'live');

  const enabled = (sessions ?? []).filter((s: any) => s.run_config?.director?.enabled === true);
  const ticks = [];
  for (const s of enabled) {
    const useAI = !!(s as any).run_config?.director?.ai;
    try {
      const r = await runDirector((s as any).id, { useAI });
      ticks.push({ sessionId: (s as any).id, fired: r.fired ?? 0, held: r.held ?? 0, aiUsed: r.aiUsed ?? false });
    } catch (e: any) {
      ticks.push({ sessionId: (s as any).id, error: String(e?.message ?? e) });
    }
  }

  return NextResponse.json({ ok: true, liveSessions: (sessions ?? []).length, directed: enabled.length, ticks });
}

export const GET = handle; // Vercel Cron issues GET
export const POST = handle; // manual/testing parity
