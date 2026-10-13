import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const status = new URL(req.url).searchParams.get("status") ?? "OPEN";
  const tickets = await db.supportTicket.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
  });
  const users = await db.user.findMany({ where: { id: { in: tickets.map((t) => t.userId) } }, select: { id: true, name: true, email: true } });
  const open = await db.supportTicket.count({ where: { status: "OPEN" } });
  return NextResponse.json({ tickets: tickets.map((t) => ({ ...t, user: users.find((u) => u.id === t.userId) ?? null })), open });
}

/** POST { ticketId, body } replies as the team; POST { ticketId, close: true } closes. */
export async function POST(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const b = await req.json().catch(() => ({}));
  const t = await db.supportTicket.findUnique({ where: { id: String(b?.ticketId ?? "") } });
  if (!t) return fail("Ticket not found.", 404);
  if (b?.close) {
    await db.supportTicket.update({ where: { id: t.id }, data: { status: "CLOSED" } });
    return NextResponse.json({ ok: true });
  }
  const body = String(b?.body ?? "").trim().slice(0, 4000);
  if (!body) return fail("Write a reply.");
  await db.supportMessage.create({ data: { ticketId: t.id, sender: "TEAM", body } });
  await db.supportTicket.update({ where: { id: t.id }, data: { status: "ANSWERED" } });
  const u = await db.user.findUnique({ where: { id: t.userId }, select: { id: true, ownerId: true } });
  if (u) await notify(u.ownerId ?? u.id, "Support replied", body.slice(0, 140), "/dashboard?support=1");
  return NextResponse.json({ ok: true });
}
