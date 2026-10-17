import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.wsId }, select: { weeklyReport: true } });
  return NextResponse.json({ weeklyReport: Boolean(u?.weeklyReport), isOwner: user.isOwner });
}

/** PATCH { weeklyReport: boolean } */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can change this.", 403);
  const b = await req.json().catch(() => ({}));
  await db.user.update({ where: { id: user.wsId }, data: { weeklyReport: Boolean(b?.weeklyReport) } });
  return NextResponse.json({ ok: true });
}
