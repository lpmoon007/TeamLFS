'use client';
import { useState } from 'react';
import { changeOwnPassword } from '@/lib/auth-actions';

// Self-service password change for a signed-in facilitator. Verifies the current password,
// enforces a minimal strength floor + confirmation, and (server-side) revokes other live
// sessions on success so a rotated password can't leave a stale session behind.
const REASONS: Record<string, string> = {
  wrong_current: 'That current password isn’t right.',
  weak_password: 'New password must be at least 8 characters.',
  same_password: 'New password must be different from the current one.',
  master_no_password: 'You’re signed in with the master key — there’s no account password to change.',
  not_signed_in: 'Your session expired — sign in again.',
  not_found: 'Account not found.',
};

export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current.length > 0 && next.length >= 8 && next === confirm && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await changeOwnPassword(current, next);
      if (res.ok) {
        setCurrent(''); setNext(''); setConfirm('');
        setFlash({ ok: true, msg: 'Password changed. Any other sessions were signed out.' });
      } else {
        setFlash({ ok: false, msg: REASONS[res.reason ?? ''] ?? 'Couldn’t change password — try again.' });
      }
    } catch {
      setFlash({ ok: false, msg: 'Couldn’t change password — try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="db-panel">
      <h2>Change password</h2>
      <div className="acct-form">
        <label className="ed-field"><span>Current password</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="ed-field"><span>New password <span className="db-dim">(≥ 8 chars)</span></span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="ed-field"><span>Confirm new password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </label>
        <div className="ed-actions">
          <button className="btn primary" disabled={!ready} onClick={submit}>{busy ? 'Saving…' : 'Change password'}</button>
          {mismatch ? <span className="ed-flash err">Passwords don’t match</span> : flash ? <span className={`ed-flash${flash.ok ? '' : ' err'}`}>{flash.msg}</span> : null}
        </div>
      </div>
    </section>
  );
}
