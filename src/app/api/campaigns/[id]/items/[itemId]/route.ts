import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";

/** PATCH { action: "sent" | "skip", message? } — the person opened WhatsApp/SMS and sent it, or skipped this lead. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id, itemId } = await params;
  const item = await db.campaignItem.findFirst({
    where: { id: itemId, campaignId: id, campaign: { userId: user.wsId } },
    include: { campaign: { select: { channel: true, name: true } }, lead: { select: { status: true } } },
  });
  if (!item) return fail("Not found.", 404);
  if (item.status !== "PENDING") return NextResponse.json({ ok: true });
  const b = await req.json().catch(() => ({}));

  if (b?.action === "skip") {
    await db.campaignItem.update({ where: { id: itemId }, data: { status: "SKIPPED" } });
    return NextResponse.json({ ok: true });
  }
  const message = String(b?.message ?? item.message).slice(0, 4000);
  const now = new Date();
  await db.campaignItem.update({ where: { id: itemId }, data: { status: "SENT", sentAt: now, message } });
  await db.lead.update({
    where: { id: item.leadId },
    data: { lastContactAt: now, ...(item.lead.status === "NEW" ? { status: "CONTACTED" } : {}) },
  });
  await logActivity(user.id, item.leadId, "MESSAGE", `${item.campaign.channel === "SMS" ? "SMS" : "WhatsApp"} (${item.campaign.name}): ${message}`);

  const left = await db.campaignItem.count({ where: { campaignId: id, status: "PENDING" } });
  if (left === 0) await db.campaign.update({ where: { id }, data: { status: "DONE" } });
  return NextResponse.json({ ok: true });
}
