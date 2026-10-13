import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { tick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  tick().catch(() => undefined); // the bell polls this, which keeps watches running while the app is open
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.notification.count({ where: { userId: user.wsId, readAt: null } }),
  ]);
  return NextResponse.json({ items, unread });
}

/** Marks everything as read. */
export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  await db.notification.updateMany({ where: { userId: user.wsId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
