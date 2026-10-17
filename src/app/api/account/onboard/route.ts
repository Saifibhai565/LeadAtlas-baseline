import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.id }, select: { onboardedAt: true } });
  return NextResponse.json({ done: Boolean(u?.onboardedAt), isOwner: user.isOwner, name: user.name.split(" ")[0] });
}

/** POST — marks the welcome wizard as seen, so it doesn't show again. */
export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  await db.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
