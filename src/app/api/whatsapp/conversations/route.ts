import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Latest message per contact, newest first. */
export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const recent = await db.waMessage.findMany({
    where: { userId: user.wsId },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: { lead: { select: { id: true, title: true } } },
  });
  const seen = new Map<string, (typeof recent)[number] & { unread: number }>();
  for (const m of recent) {
    const c = seen.get(m.contact);
    if (!c) seen.set(m.contact, { ...m, unread: m.direction === "IN" && m.status === "received" ? 1 : 0 });
    else if (m.direction === "IN" && m.status === "received") c.unread++;
  }
  return NextResponse.json({
    conversations: Array.from(seen.values())
      .slice(0, 200)
      .map((m) => ({
        contact: m.contact,
        lead: m.lead,
        last: m.body.slice(0, 120),
        lastAt: m.createdAt,
        lastDirection: m.direction,
        unread: m.unread,
      })),
  });
}
