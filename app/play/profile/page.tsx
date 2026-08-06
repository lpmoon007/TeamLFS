import Link from 'next/link';
import { facilitator, isAdmin } from '@/lib/facilitator-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buildFingerprint } from '@/lib/profile/fingerprint';
import { getLedger } from '@/lib/profile/ledger';
import { listDecisions } from '@/lib/preflight-actions';
import { buildNextScenarioForSubject } from '@/lib/profile/next-scenario';
import { listPeople } from '@/lib/facilitator-actions';
import { ProfileView } from '@/components/ProfileView';
import { getRepState, repDay, type RepRow } from '@/lib/rep';

// The participant's own Leadership Profile — private to them (and their coach), resolved by
// email. Admins/master can also PREVIEW any subject's profile read-only with ?as=<subjectId|
// email> — for testing the layout without logging in as them.
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const me = await facilitator();
  if (!me) return <FacilitatorLogin />;
  const { as } = await searchParams;
  const admin = await isAdmin();
  const db = createAdminClient();

  // resolve which subject to render: a preview target (admin only) or the signed-in person
  let subjectId: string | null = null;
  let displayName = me.displayName || me.email || '';
  let preview = false;
  if (as && admin) {
    const byId = /^[0-9a-f-]{36}$/i.test(as)
      ? (await db.from('subjects').select('id, handle, display_name').eq('id', as).maybeSingle<any>()).data
      : null;
    const sub = byId ?? (await db.from('subjects').select('id, handle, display_name').eq('handle', as.toLowerCase()).maybeSingle<any>()).data;
    if (sub) { subjectId = sub.id; displayName = sub.display_name || sub.handle; preview = true; }
  }
  if (!subjectId && !me.isMaster && /@/.test(me.email)) {
    const { data: mine } = await db.from('subjects').select('id').eq('handle', me.email.toLowerCase()).maybeSingle<any>();
    subjectId = mine?.id ?? null;
  }

  const [fp, ledger] = subjectId ? await Promise.all([buildFingerprint(subjectId), getLedger(subjectId)]) : [null, null];
  const decisions = subjectId && !preview ? await listDecisions() : null; // decisions are self-scoped; read-only in preview
  const nextScenario = subjectId ? await buildNextScenarioForSubject(subjectId) : null;
  const repState: RepRow | null = subjectId ? await getRepState(subjectId) : null;

  // state-aware 30-day-rep CTA: none → prompt; committed → day N of 30; complete → kept X/30
  const showRepCta = !!subjectId && !preview && !!fp;
  const repCta = !repState
    ? { label: 'Your 30-day rep', cls: '' }
    : repState.outcome
      ? { label: `Rep complete · kept ${repState.daysLogged ?? 0}/30`, cls: 'done' }
      : { label: `Rep committed · day ${repDay(repState.committedAt, new Date())} of 30`, cls: 'live' };

  // master/admin with no profile of their own and no preview target → offer a picker
  const showPicker = !subjectId && admin;
  const people = showPicker ? (await listPeople()).filter((p) => p.runs > 0 && !!p.email) : [];

  return (
    <div className="play-wrap">
      <header className="play-head">
        <div className="wm">Leadership Failure <span>Simulations</span></div>
        <div className="play-head-r">
          <Link className="btn" href="/play">← Play</Link>
          {showRepCta ? <a className={`btn rep-cta ${repCta.cls}`} href="#rep">{repCta.label}</a> : null}
          <Link className="btn brief" href="/play/preflight">Before You Decide →</Link>
          <span className="play-who">{me.displayName || me.email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="play-body">
        {preview ? (
          <div className="pf-preview-bar">
            <span>Previewing <b>{displayName}</b>’s profile — read-only.</span>
            <Link className="btn ghost" href="/play/profile">Exit preview</Link>
          </div>
        ) : null}
        {showPicker ? (
          <div className="pf">
            <div className="pf-top"><h1 className="pf-h1">Preview a profile</h1><span className="pf-badge">admin</span></div>
            <p className="pf-lead">The master key has no profile of its own. Pick a person with runs to render their full profile read-only.</p>
            {people.length ? (
              <div className="pf-pick">
                {people.map((p) => (
                  <Link className="pf-pick-row" key={p.id} href={`/play/profile?as=${p.id}`}>
                    <span className="pf-pick-name">{p.name}</span>
                    <span className="pf-pick-email">{p.email}</span>
                    <span className="pf-pick-runs">{p.runs} run{p.runs === 1 ? '' : 's'}</span>
                    <span className="pf-pick-go">Preview →</span>
                  </Link>
                ))}
              </div>
            ) : <p className="pf-empty">No one has completed a run yet.</p>}
          </div>
        ) : (
          <ProfileView fp={fp} ledger={ledger} name={displayName.split(' ')[0]} decisions={decisions ?? []} nextScenario={nextScenario} preview={preview} previewSubjectId={preview ? subjectId ?? undefined : undefined} repCommitted={repState} />
        )}
      </div>
    </div>
  );
}
