import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { appUrl } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({
    where: { id: user.wsId },
    select: { meetingSlug: true, meetingTitle: true, meetingMinutes: true, meetingDays: true, meetingTz: true },
  });
  const bookings = await db.booking.findMany({ where: { userId: user.wsId, status: "CONFIRMED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 50 });
  return NextResponse.json({
    ...u,
    link: u?.meetingSlug ? appUrl(`/book/${u.meetingSlug}`) : null,
    isOwner: user.isOwner,
    bookings,
  });
}

/** PATCH { title, minutes, days, tz, enable } — set up or update the booking page. */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can set up the booking page.", 403);
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b?.enable) {
    const cur = await db.user.findUnique({ where: { id: user.wsId }, select: { meetingSlug: true } });
    if (!cur?.meetingSlug) data.meetingSlug = `${(user.name || "meet").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}-${randomBytes(3).toString("hex")}`;
  }
  if (b?.title !== undefined) data.meetingTitle = String(b.title).trim().slice(0, 80) || null;
  if (b?.minutes != null) data.meetingMinutes = [15, 30, 45, 60].includes(Number(b.minutes)) ? Number(b.minutes) : 30;
  if (b?.tz) data.meetingTz = String(b.tz).slice(0, 40);
  if (b?.days) data.meetingDays = JSON.stringify(b.days);
  await db.user.update({ where: { id: user.wsId }, data });
  return NextResponse.json({ ok: true });
}
