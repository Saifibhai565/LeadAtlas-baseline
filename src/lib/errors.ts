import { db } from "./db";

/** Small string hash (FNV-1a), so this file needs no Node-only modules. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + s.length.toString(16);
}

/** Records an error once per kind (message + where), counting repeats. Never throws. */
export async function recordError(e: { source: "SERVER" | "BROWSER"; message: string; stack?: string | null; path?: string | null; userId?: string | null }) {
  try {
    const message = (e.message || "Unknown error").slice(0, 500);
    const firstFrame = (e.stack ?? "").split("\n").find((l) => l.includes("at ")) ?? "";
    const where = (e.path ?? "").replace(/\/[a-z0-9]{20,}/gi, "/:id").replace(/\?.*$/, "");
    const fingerprint = hash(`${e.source}|${message.replace(/\d+/g, "#")}|${firstFrame.trim()}|${where}`);
    await db.errorLog.upsert({
      where: { fingerprint },
      create: { fingerprint, source: e.source, message, stack: e.stack?.slice(0, 4000) ?? null, path: where || null, lastUserId: e.userId ?? null },
      update: { count: { increment: 1 }, lastSeen: new Date(), resolved: false, lastUserId: e.userId ?? undefined, stack: e.stack?.slice(0, 4000) ?? undefined },
    });
  } catch {
    /* error logging must never cause errors */
  }
}
