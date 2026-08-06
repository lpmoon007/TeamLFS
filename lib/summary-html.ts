// Render an authored scenario summary as HTML with a tiny formatting allowlist (Screen-15
// handoff §1b). Escapes everything, then re-allows only <b>/<strong>/<em>/<i>/<br> — so authored
// bold renders but no literal tags leak into the copy and no arbitrary markup can inject.
export function summaryHtml(s: string | null | undefined): string {
  if (!s) return '';
  const esc = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/&lt;(\/?)(b|strong|em|i)&gt;/gi, '<$1$2>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}
