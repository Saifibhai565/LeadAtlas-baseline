import { NextResponse } from "next/server";
import { forgetBulkTransport } from "@/lib/bulk-sender";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { getPlatformSmtp } from "@/lib/platform-sender";

/** PATCH { dailyLimit?, gapSeconds?, fromName?, replyTo?, active? } — any number the server allows. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const mb = await db.mailbox.findFirst({ where: { id, userId: user.wsId } });
  if (!mb) return fail("Not found.", 404);
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  const p = mb.platform ? await getPlatformSmtp() : null;
  const maxDaily = mb.platform ? (user.isAdmin ? 100000 : p?.dailyLimit ?? 500) : 100000;
  if (b.dailyLimit != null) {
    const n = Math.round(Number(b.dailyLimit));
    if (!(n >= 1)) return fail("Daily limit must be 1 or more.");
    if (n > maxDaily) return fail(`The most this sender can do is ${maxDaily.toLocaleString("en-US")} a day.`);
    data.dailyLimit = n;
  }
  if (b.gapSeconds != null) {
    const g = Math.round(Number(b.gapSeconds));
    const min = mb.platform && !user.isAdmin ? p?.gapSeconds ?? 5 : 1;
    if (!(g >= min && g <= 3600)) return fail(`Wait between emails must be between ${min} and 3600 seconds.`);
    data.gapSeconds = g;
  }
  if (b.sendFromHour != null) data.sendFromHour = Math.min(23, Math.max(0, Math.round(Number(b.sendFromHour)) || 0));
  if (b.sendToHour != null) data.sendToHour = Math.min(23, Math.max(0, Math.round(Number(b.sendToHour)) || 0));
  if (b.sendTz !== undefined) data.sendTz = String(b.sendTz).trim().slice(0, 40) || null;
  if (b.fromName) data.fromName = String(b.fromName).trim().slice(0, 80);
  if (b.replyTo !== undefined) data.replyTo = String(b.replyTo).trim().toLowerCase() || null;
  if (typeof b.active === "boolean") Object.assign(data, { active: b.active, ...(b.active ? { lastError: null } : {}) });
  await db.mailbox.update({ where: { id }, data });
  forgetBulkTransport(id);
  return NextResponse.json({ ok: true });
}
