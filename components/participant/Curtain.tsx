'use client';

// Exit / debrief handoff (handoff §9). Shown when the session ends.
export function Curtain() {
  return (
    <div className="scrim">
      <div className="modal">
        <div className="m-head">That's the end of the simulation.</div>
        <div className="m-body">
          {`The clock has stopped. Thank you for playing yourself.

Your facilitator will take it from here. Everything you did — what you decided, when, who you told, and what you didn't say — is now part of the debrief.`}
        </div>
      </div>
    </div>
  );
}
