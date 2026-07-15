'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { facilitatorLogin } from '@/lib/facilitator-actions';
import { accountLogin } from '@/lib/auth-actions';

export function FacilitatorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [key, setKey] = useState('');
  const [useKey, setUseKey] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = useKey ? await facilitatorLogin(key) : await accountLogin(email, password);
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(useKey ? 'Invalid key.' : 'Wrong email or password.');
  };

  return (
    <div className="notice-wrap">
      <div className="notice">
        <div className="wm">IN<span>COMMAND</span> · ADMIN</div>
        <h1>Sign in</h1>
        <form className="fac-login" onSubmit={submit}>
          {useKey ? (
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Master key" autoFocus />
          ) : (
            <>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="username" autoFocus />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
            </>
          )}
          <button className="btn primary" disabled={busy || (useKey ? !key : !email || !password)}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {err ? <p className="nm" style={{ color: 'var(--danger, #c25a4a)' }}>{err}</p> : null}
        <button type="button" className="link-btn" onClick={() => { setUseKey(!useKey); setErr(''); }}>
          {useKey ? '← Sign in with email' : 'Use the master key instead'}
        </button>
      </div>
    </div>
  );
}
