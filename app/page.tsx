import Link from 'next/link';

// Closed root (§2A routing). Uninvited visitors land here, so it offers the two ways in —
// player and facilitator sign-in — plus the note for invited participants, who just open their
// link. The sign-in form itself is the same for both; it routes by role after login.
export default function Home() {
  return (
    <div className="notice-wrap">
      <div className="notice">
        <div className="wm">
          Leadership Failure <span>Simulations</span> · THE SIGNAL
        </div>
        <h1>Sign in to continue.</h1>
        <p className="nm">
          Choose how you’re joining. If you were sent a participant link, just open it to take your
          seat — no sign-in needed.
        </p>
        <div className="home-cta">
          <Link className="btn primary" href="/play">Player sign-in →</Link>
          <Link className="btn" href="/facilitator">Facilitator sign-in →</Link>
        </div>
      </div>
    </div>
  );
}
