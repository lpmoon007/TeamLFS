'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { facilitatorLogin } from '@/lib/facilitator-actions';

export function FacilitatorLogin() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="notice-wrap">
      <div className="notice">
        <div className="wm">
          IN<span>COMMAND</span> · FACILITATOR
        </div>
        <h1>Facilitator sign-in</h1>
        <p className="nm">Enter the facilitator key to control live sessions.</p>
        <form
          className="fac-login"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(false);
            const res = await facilitatorLogin(key);
            setBusy(false);
            if (res.ok) router.refresh();
            else setErr(true);
          }}
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Facilitator key"
            autoFocus
          />
          <button className="btn primary" disabled={busy || !key}>
            {busy ? 'Checking…' : 'Enter'}
          </button>
        </form>
        {err ? <p className="nm" style={{ color: 'var(--danger)' }}>Invalid key.</p> : null}
      </div>
    </div>
  );
}
