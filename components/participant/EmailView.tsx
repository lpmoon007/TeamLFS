'use client';
import type { EmailRow } from '@/lib/types';
import { formatTime } from '@/lib/ui';

// Read path: formal email render. Approve / Return / Edit are shown but disabled —
// the document actions (and the events they emit) land in Phase 4.
export function EmailView({ email }: { email: EmailRow }) {
  const body = (email.body_json?.text as string | undefined) ?? '';
  const attachment = email.body_json?.attachment as string | undefined;
  return (
    <div className="main">
      <div className="view-head">
        <div className="vh-main">
          <div className="vh-title">Email</div>
          <div className="vh-sub">{email.delivered_at ? formatTime(email.delivered_at) : ''}</div>
        </div>
      </div>
      <div className="view-scroll">
        <div className="email-formal">
          <div className="e-head">
            <div className="e-subject">{email.subject}</div>
            <div className="e-fields">From: {email.contact_key}</div>
          </div>
          <div className="e-body">{body || '(no body)'}</div>

          {email.document_id || attachment ? (
            <div className="attachment">
              <div className="a-title">📎 {attachment ?? 'Attachment'}</div>
              <div className="a-actions">
                <button className="btn primary" disabled>
                  Approve
                </button>
                <button className="btn" disabled>
                  Return
                </button>
                <button className="btn ghost" disabled>
                  Edit
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
