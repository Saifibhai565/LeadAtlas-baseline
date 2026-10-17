import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { freeSlots } from "@/lib/booking";
import { allow, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Public: free slots for a booking page, and makes a booking. */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const owner = await db.user.findUnique({ where: { meetingSlug: slug }, select: { id: true, name: true, businessName: true, meetingTitle: true, meetingMinutes: true, meetingTz: true, blocked: true } });
  if (!owner || owner.blocked) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({
    host: owner.businessName || owner.name,
    title: owner.meetingTitle || `Meeting with ${owner.businessName || owner.name}`,
    minutes: owner.meetingMinutes,
    tz: owner.meetingTz,
    days: await freeSlots(owner.id),
  });
}

export async function POST(req: Request) {
  if (!allow(`book:${clientIp(req)}`, 5, 3600_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const owner = await db.user.findUnique({ where: { meetingSlug: String(b?.slug ?? "") }, select: { id: true, meetingMinutes: true, email: true, name: true } });
  if (!owner) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const name = String(b?.name ?? "").trim().slice(0, 80);
  const starts = new Date(String(b?.iso ?? ""));
  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (Number.isNaN(starts.getTime()) || starts < new Date()) return NextResponse.json({ error: "Pick a time." }, { status: 400 });
  const clash = await db.booking.findFirst({ where: { userId: owner.id, status: "CONFIRMED", startsAt: starts } });
  if (clash) return NextResponse.json({ error: "That time was just taken. Pick another." }, { status: 409 });

  const booking = await db.booking.create({
    data: { userId: owner.id, name, email: String(b?.email ?? "").trim().slice(0, 120) || null, phone: String(b?.phone ?? "").trim().slice(0, 30) || null, startsAt: starts, minutes: owner.meetingMinutes, note: String(b?.note ?? "").trim().slice(0, 500) || null },
  });
  const { notify } = await import("@/lib/notify");
  await notify(owner.id, `New meeting booked: ${name}`, starts.toLocaleString("en-GB"), "/meeting");
  // Try to email the owner and the booker
  const { sendMailLater } = await import("@/lib/mail");
  const { emails } = await import("@/lib/emails");
  const when = starts.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  sendMailLater({ ...emails.test(owner.email), subject: `Meeting booked: ${name}`, text: `${name} booked a meeting for ${when}.${b?.email ? ` Email: ${b.email}.` : ""}${b?.phone ? ` Phone: ${b.phone}.` : ""}`, html: `<p><strong>${name}</strong> booked a meeting for <strong>${when}</strong>.</p>` });
  if (b?.email) sendMailLater({ ...emails.test(String(b.email)), subject: `Your meeting with ${owner.name}`, text: `Your meeting is confirmed for ${when}.`, html: `<p>Your meeting is confirmed for <strong>${when}</strong>.</p>` });
  return NextResponse.json({ ok: true, id: booking.id });
}
