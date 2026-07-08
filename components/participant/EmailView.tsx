'use client';
import { useState } from 'react';
import type { DocumentRow, EmailRow } from '@/lib/types';
import { formatTime } from '@/lib/ui';

// Phase 4: formal email + document actions. If the email carries a document, the
// participant can Approve / Return (with a reason) / Edit it. Each action writes a
// capture-log event (doc_approved | doc_returned | doc_edited); Approve/Return are
// terminal and lock the controls.
export function EmailView({
  email,
  document,
  canAct,
  onApprove,
  onReturn,
  onEdit,
}: {
  email: EmailRow;
  document: DocumentRow | null;
  canAct: boolean;
  onApprove: () => void;
  onReturn: (reason: string) => void;
  onEdit: (text: string) => void;
}) {
  const emailBody = (email.body_json?.text as string | undefined) ?? '';
  const editedText = (email.decision_json?.edited_text as string | undefined) ?? '';
  const docTitle = document?.title ?? (email.body_json?.attachment as string | undefined) ?? 'Attachment';
  const docBody = editedText || ((document?.body_json?.text as string | undefined) ?? '');

  const [mode, setMode] = useState<'view' | 'edit' | 'return'>('view');
  const [draft, setDraft] = useState(docBody);
  const [reason, setReason] = useState('');

  const decided = email.decision; // 'approved' | 'returned' | null
  const hasDoc = Boolean(email.document_id || email.body_json?.attachment);

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
          <div className="e-body">{emailBody || '(no body)'}</div>

          {hasDoc ? (
            <div className="attachment">
              <div className="a-title">📎 {docTitle}</div>

              {mode === 'edit' ? (
                <>
                  <textarea
                    className="doc-edit"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="a-actions">
                    <button className="btn primary" onClick={() => { onEdit(draft); setMode('view'); }}>
                      Save edits
                    </button>
                    <button className="btn ghost" onClick={() => { setDraft(docBody); setMode('view'); }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="doc-body">{docBody || '(document body unavailable)'}</div>
              )}

              {mode === 'return' ? (
                <div style={{ marginTop: 12 }}>
                  <textarea
                    className="doc-edit"
                    placeholder="Reason for returning (optional)…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="a-actions">
                    <button className="btn" onClick={() => { onReturn(reason); setMode('view'); }}>
                      Confirm return
                    </button>
                    <button className="btn ghost" onClick={() => setMode('view')}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {decided ? (
                <div className={`decision ${decided}`}>
                  {decided === 'approved' ? '✓ Approved' : '↩ Returned'}
                  {email.decision_json?.reason ? ` — ${String(email.decision_json.reason)}` : ''}
                </div>
              ) : mode === 'view' ? (
                <div className="a-actions">
                  <button className="btn primary" disabled={!canAct} onClick={onApprove}>
                    Approve
                  </button>
                  <button className="btn" disabled={!canAct} onClick={() => setMode('return')}>
                    Return
                  </button>
                  <button className="btn ghost" disabled={!canAct} onClick={() => { setDraft(docBody); setMode('edit'); }}>
                    Edit
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
