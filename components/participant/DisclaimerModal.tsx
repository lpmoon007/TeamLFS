'use client';
import { useState } from 'react';

// One-time disclaimer gate (handoff §9). On accept the live session begins and
// presence flips online (server action handled by the parent).
export function DisclaimerModal({ onAccept }: { onAccept: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="scrim">
      <div className="modal">
        <div className="m-head">Before you begin</div>
        <div className="m-body">
          {`You are playing yourself. There is no role to perform — respond the way you actually would.

Your engagement pattern is part of what is being measured: not just what you decide, but when you decide, who you tell, and what you don't say.

There are no right answers. There are only your answers.

This is a fictional scenario. All characters, organizations, and situations are invented. By continuing you agree to take part in the simulation and to its activity being recorded for the debrief.`}
        </div>
        <div className="m-foot">
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onAccept();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Entering…' : 'Enter the simulation'}
          </button>
        </div>
      </div>
    </div>
  );
}
