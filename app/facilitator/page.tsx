import Link from 'next/link';
import { isFacilitatorSession } from '@/lib/facilitator-session';
import { listSessions } from '@/lib/facilitator-actions';
import { FacilitatorLogin } from '@/components/facilitator/FacilitatorLogin';
import { LogoutButton } from '@/components/facilitator/LogoutButton';

// Facilitator home: sign-in gate → live session list.
export default async function FacilitatorHome() {
  if (!(await isFacilitatorSession())) return <FacilitatorLogin />;

  const sessions = await listSessions();
  return (
    <div className="fac">
      <header className="fac-head">
        <div className="wm">
          IN<span>COMMAND</span> · FACILITATOR
        </div>
        <div className="spacer" />
        <LogoutButton />
      </header>
      <div className="fac-body">
        <h1>Sessions</h1>
        {sessions.length === 0 ? (
          <p className="db-sub">No sessions yet.</p>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Status</th>
                  <th>Present</th>
                  <th>Participants</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.scenario}</strong>
                      <div className="db-role">{s.id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <span className={`pill ${s.status}`}>{s.status}</span>
                    </td>
                    <td>{s.present}</td>
                    <td>{s.participants}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link className="btn" href={`/facilitator/${s.id}`}>
                        Control
                      </Link>{' '}
                      <Link className="btn ghost" href={`/facilitator/debrief/${s.id}`}>
                        Debrief
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
