import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { windowOpen } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ contact: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const contact = (await params).contact.replace(/\D/g, "");
  const messages = await db.waMessage.findMany({ where: { userId: user.wsId, contact }, orderBy: { createdAt: "asc" }, take: 300 });
  // Opening a conversation marks its incoming messages as read in the inbox
  await db.waMessage.updateMany({ where: { userId: user.wsId, contact, direction: "IN", status: "received" }, data: { status: "seen" } });
  const lead = messages.find((m) => m.leadId)?.leadId
    ? await db.lead.findUnique({ where: { id: messages.find((m) => m.leadId)!.leadId! }, select: { id: true, title: true, optIn: true, status: true } })
    : null;
  return NextResponse.json({ messages, lead, windowOpen: await windowOpen(user.wsId, contact) });
}
