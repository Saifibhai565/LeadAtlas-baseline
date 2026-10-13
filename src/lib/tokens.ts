import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates a one-time token for VERIFY or RESET. Only its hash is stored. */
export async function createEmailToken(userId: string, type: "VERIFY" | "RESET", ttlMs: number) {
  const token = randomBytes(24).toString("base64url");
  // One live token per type: older ones stop working
  await db.emailToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.emailToken.create({ data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

/** Returns the user id if the token is valid, and marks it used. */
export async function consumeEmailToken(token: string, type: "VERIFY" | "RESET") {
  const row = await db.emailToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  await db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}

/** Checks a token without using it (for showing the reset form). */
export async function peekEmailToken(token: string, type: "VERIFY" | "RESET") {
  const row = await db.emailToken.findUnique({ where: { tokenHash: hash(token) } });
  return Boolean(row && row.type === type && !row.usedAt && row.expiresAt > new Date());
}
