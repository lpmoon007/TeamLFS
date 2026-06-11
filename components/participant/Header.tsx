'use client';
import { initials } from '@/lib/ui';

export function Header({
  scenarioTitle,
  seatName,
  seatRole,
  connected,
  onOpenBrief,
}: {
  scenarioTitle: string;
  seatName: string;
  seatRole: string | null;
  connected: boolean;
  onOpenBrief: () => void;
}) {
  return (
    <header className="header">
      <div className="wordmark">
        IN<span>COMMAND</span>
      </div>
      <div className="scenario">{scenarioTitle}</div>
      <div className="spacer" />
      <div className="statusline" title={connected ? 'Live — connected' : 'Reconnecting…'}>
        <span className={connected ? 'live' : 'off'} />
        {connected ? 'Live' : 'Offline'}
      </div>
      <button className="btn brief" onClick={onOpenBrief}>
        Your Brief
      </button>
      <div className="identity">
        <div className="who">
          <div className="name">{seatName}</div>
          {seatRole ? <div className="role">{seatRole}</div> : null}
        </div>
        <div className="avatar">{initials(seatName)}</div>
      </div>
    </header>
  );
}
