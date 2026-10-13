import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";
import { allow } from "./ratelimit";

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function newKey() {
  const key = `la_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 10), keyHash: hashKey(key) };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function apiJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS });
}

export function apiError(message: string, status = 400) {
  return apiJson({ error: message }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Authenticates a public API request. Returns the workspace id, or an error response. */
export async function apiAuth(req: Request): Promise<{ wsId: string } | { res: Response }> {
  const header = req.headers.get("authorization") ?? "";
  const key = header.replace(/^Bearer\s+/i, "").trim();
  if (!key.startsWith("la_")) return { res: apiError("Send your API key as: Authorization: Bearer la_...", 401) };

  const row = await db.apiKey.findUnique({
    where: { keyHash: hashKey(key) },
    include: { user: { select: { id: true, blocked: true, role: true, planExpiresAt: true, plan: { select: { api: true } } } } },
  });
  if (!row || row.user.blocked) return { res: apiError("This API key isn't valid.", 401) };

  const planOk = row.user.plan?.api && (!row.user.planExpiresAt || row.user.planExpiresAt > new Date());
  if (!planOk && row.user.role !== "ADMIN") return { res: apiError("Your plan doesn't include API access.", 402) };

  if (!allow(`api:${row.id}`, 120, 60_000)) return { res: apiError("Too many requests. The limit is 120 per minute.", 429) };
  db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { wsId: row.user.id };
}
