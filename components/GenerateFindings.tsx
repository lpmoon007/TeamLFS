'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateMyProfile } from '@/lib/profile-actions';

// The generation trigger on the profile. Findings are written by a two-call pipeline
// (adversarial audit → generation → grounding), so it runs on demand with a clear working
// state rather than blocking the page. First profile appears from run 1; each new completed
// run re-grades the ledger.
export function GenerateFindings({ runNo, hasProfile }: { runNo: number; hasProfile: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const REASONS: Record<string, string> = {
    no_api_key: 'Findings generation isn’t configured yet (no API key).',
    no_runs: 'Finish a run first.',
    nothing_grounded: 'Nothing could be evidenced from your record yet — play another run.',
    generation_failed: 'Couldn’t reach the model — try again in a moment.',
  };

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await generateMyProfile();
      if (res.ok) router.refresh();
      else setErr(REASONS[res.reason ?? ''] ?? 'Couldn’t generate just now — try again.');
    } catch {
      setErr('Couldn’t generate just now — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pf-gen">
      <button className="btn primary" disabled={busy} onClick={run}>
        {busy ? 'Reading your record…' : hasProfile ? `Re-grade with run ${runNo}` : 'Generate my findings'}
      </button>
      {busy ? <span className="pf-gen-note">Auditing prior claims, then writing new ones — a few seconds.</span> : null}
      {err ? <span className="pf-gen-err">{err}</span> : null}
    </div>
  );
}
