/** Removes scripts, event handlers and external loads from AI-made HTML. It is also shown in a sandboxed frame. */
export function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|form|base|meta[^>]*http-equiv)[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/@import[^;]+;/gi, "")
    .replace(/(src|href)\s*=\s*("|')\s*(https?:)?\/\/(?!wa\.me|maps\.google|www\.google\.com\/maps)[^"']*\2/gi, '$1="#"');
}
