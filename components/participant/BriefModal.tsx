'use client';
import type { DocumentRow } from '@/lib/types';

// "Your Brief" / "Read full brief" modal (handoff §9: persistent, one tap away).
export function BriefModal({
  title,
  doc,
  onClose,
}: {
  title: string;
  doc: DocumentRow | null;
  onClose: () => void;
}) {
  const text = (doc?.body_json?.text as string | undefined) ?? 'No brief available.';
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-head">{doc?.title ?? title}</div>
        <div className="m-body">{text}</div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
