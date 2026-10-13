import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { appUrl } from "@/lib/mail";

/** GET: the workspace's private Sheets feed link. POST: make a new link (the old one stops working). */
export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.wsId }, select: { feedToken: true } });
  return NextResponse.json({ url: u?.feedToken ? appUrl(`/api/feed/${u.feedToken}`) : null, isOwner: user.isOwner });
}

export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can create the feed link.", 403);
  const token = randomBytes(18).toString("base64url");
  await db.user.update({ where: { id: user.wsId }, data: { feedToken: token } });
  return NextResponse.json({ url: appUrl(`/api/feed/${token}`) });
}
