import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { allow, clientIp } from "@/lib/ratelimit";

/** A customer of the business sends a private message from the review page. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!allow(`fb:${clientIp(req)}`, 5, 3600_000)) return NextResponse.json({ error: "Too many messages." }, { status: 429 });
  const { token } = await params;
  const lead = await db.lead.findUnique({ where: { reviewToken: token }, select: { id: true, userId: true, title: true } });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const message = String(b?.message ?? "").trim().slice(0, 2000);
  if (message.length < 3) return NextResponse.json({ error: "Write a message." }, { status: 400 });
  await db.feedback.create({
    data: { userId: lead.userId, leadId: lead.id, name: String(b?.name ?? "").trim().slice(0, 80) || null, contact: String(b?.contact ?? "").trim().slice(0, 80) || null, message },
  });
  await notify(lead.userId, `Private feedback for ${lead.title}`, message.slice(0, 140), `/leads?q=${encodeURIComponent(lead.title)}`);
  return NextResponse.json({ ok: true });
}
