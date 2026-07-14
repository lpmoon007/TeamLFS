'use client';
import { useState } from 'react';
import type { DecisionBoard, Valence } from '@/lib/deliberation-types';
import type { Teammate } from '@/lib/types';

// The Decision Room — the team's shared deliberation surface. Put an option on the table,
// take a stance on any option (support / dissent), and lock the team's decision. Each act
// is an append-only event on the LOCKED log; this view is a live read of the board that
// every seat sees. It's what makes the Tier-B "resilience under stress" and "safety
// trajectory" measurable — the room's alternatives and dissent, captured as they happen.

export function DecisionRoom({
  board,
  seatKey,
  teammates,
  canAct,
  onProposal,
  onStance,
  onLock,
}: {
  board: DecisionBoard;
  seatKey: string;
  teammates: Teammate[];
  canAct: boolean;
  onProposal: (summary: string) => void;
  onStance: (optionId: string, valence: Valence) => void;
  onLock: (optionId: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const nameByKey = new Map(teammates.map((t) => [t.seat_key, t.name]));
  const label = (k: string) => (k === seatKey ? 'You' : nameByKey.get(k) ?? k);
  const locked = board.lock;

  const submit = () => {
    const s = draft.trim();
    if (!s) return;
    onProposal(s);
    setDraft('');
  };

  return (
    <div className="main droom">
      <div className="droom-head">
        <h2>Decision Room</h2>
        <p>Put options on the table, take a stance, and lock the team’s call together. Everyone sees this board.</p>
      </div>

      {locked ? (
        <div className="droom-locked">
          <div className="droom-locked-tag">✓ Decision locked</div>
          <div className="droom-locked-text">{locked.text}</div>
          <div className="droom-locked-meta">
            Locked by {label(locked.by)} · {locked.unanimous ? 'unanimous' : locked.dissenters.length ? `over dissent from ${locked.dissenters.map(label).join(', ')}` : 'not unanimous'}
          </div>
        </div>
      ) : null}

      <div className="droom-options">
        {board.options.length === 0 ? (
          <div className="droom-empty">No options on the table yet. Propose the first direction below.</div>
        ) : (
          board.options.map((o) => {
            const mine = o.stances.find((s) => s.seat === seatKey)?.valence;
            const support = o.stances.filter((s) => s.valence === 1);
            const dissent = o.stances.filter((s) => s.valence === -1);
            const isLocked = locked?.optionId === o.optionId;
            return (
              <div className={`droom-opt ${isLocked ? 'is-locked' : ''}`} key={o.optionId}>
                <div className="droom-opt-top">
                  <div className="droom-opt-summary">{o.summary}</div>
                  <div className="droom-opt-author">{label(o.author)}</div>
                </div>
                <div className="droom-tally">
                  <span className="droom-pill support">▲ {support.length}</span>
                  <span className="droom-pill dissent">▼ {dissent.length}</span>
                  {support.length + dissent.length > 0 ? (
                    <span className="droom-who">
                      {[...support.map((s) => label(s.seat)), ...dissent.map((s) => `${label(s.seat)} (dissent)`)].join(' · ')}
                    </span>
                  ) : (
                    <span className="droom-who dim">no stances yet</span>
                  )}
                </div>
                {canAct && !locked ? (
                  <div className="droom-actions">
                    <button className={`droom-btn ${mine === 1 ? 'on support' : ''}`} onClick={() => onStance(o.optionId, mine === 1 ? 0 : 1)}>
                      Support
                    </button>
                    <button className={`droom-btn ${mine === -1 ? 'on dissent' : ''}`} onClick={() => onStance(o.optionId, mine === -1 ? 0 : -1)}>
                      Dissent
                    </button>
                    <button className="droom-btn lock" onClick={() => onLock(o.optionId)}>
                      Lock this
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {canAct && !locked ? (
        <div className="droom-compose">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Propose an option — a direction the team could take…"
            rows={2}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
            }}
          />
          <button className="droom-propose" onClick={submit} disabled={!draft.trim()}>
            Put on the table
          </button>
        </div>
      ) : null}
    </div>
  );
}
