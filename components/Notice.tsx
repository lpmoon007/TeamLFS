// Centered notice used for guard states (handoff §2A: invalid/used token, session
// not started / ended) and generic errors.
export function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="notice-wrap">
      <div className="notice">
        <div className="wm">
          IN<span>COMMAND</span> · THE SIGNAL
        </div>
        <h1>{title}</h1>
        <p className="nm">{message}</p>
      </div>
    </div>
  );
}
