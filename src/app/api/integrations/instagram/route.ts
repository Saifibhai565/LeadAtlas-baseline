import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { igLookup } from "@/lib/instagram";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.wsId }, select: { igUserId: true, igTokenEnc: true } });
  return NextResponse.json({ connected: Boolean(u?.igUserId && u?.igTokenEnc), igUserId: u?.igUserId ?? null, isOwner: user.isOwner });
}

/** POST { igUserId, token } — your own Instagram Business account id and a token with instagram_basic access. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can connect Instagram.", 403);
  const b = await req.json().catch(() => ({}));
  const igUserId = String(b?.igUserId ?? "").trim();
  const token = String(b?.token ?? "").trim();
  if (!/^\d{6,}$/.test(igUserId)) return fail("Enter your Instagram Business account ID (digits).");
  if (token.length < 20) return fail("Enter the access token.");
  try {
    await igLookup(igUserId, token, "instagram"); // a known public business account, as a test
  } catch (err) {
    return fail(`Instagram didn't accept these details: ${err instanceof Error ? err.message : "error"}`);
  }
  await db.user.update({ where: { id: user.wsId }, data: { igUserId, igTokenEnc: encrypt(token) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can disconnect Instagram.", 403);
  await db.user.update({ where: { id: user.wsId }, data: { igUserId: null, igTokenEnc: null } });
  return NextResponse.json({ ok: true });
}
