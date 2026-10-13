/** Tags are stored as ",hot,clinic," so a filter can match a whole tag exactly. */
export function parseTags(stored: string | null | undefined): string[] {
  return (stored ?? "").split(",").map((t) => t.trim()).filter(Boolean);
}

export function cleanTag(t: string) {
  return t.trim().toLowerCase().replace(/[,]/g, " ").replace(/\s+/g, " ").slice(0, 30);
}

export function storeTags(list: string[]): string | null {
  const unique = Array.from(new Set(list.map(cleanTag).filter(Boolean))).slice(0, 20);
  return unique.length ? `,${unique.join(",")},` : null;
}
