import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.wsId }, select: { hubspotTokenEnc: true } });
  return NextResponse.json({ connected: Boolean(u?.hubspotTokenEnc), isOwner: user.isOwner });
}

/** POST { token } checks the token with HubSpot and saves it. DELETE disconnects. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can connect HubSpot.", 403);
  const b = await req.json().catch(() => ({}));
  const token = String(b?.token ?? "").trim();
  if (token.length < 20) return fail("Paste the private app access token.");
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies?limit=1", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return fail("HubSpot didn't accept this token. It needs the companies and contacts read/write scopes.");
  await db.user.update({ where: { id: user.wsId }, data: { hubspotTokenEnc: encrypt(token) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can disconnect HubSpot.", 403);
  await db.user.update({ where: { id: user.wsId }, data: { hubspotTokenEnc: null } });
  return NextResponse.json({ ok: true });
}
