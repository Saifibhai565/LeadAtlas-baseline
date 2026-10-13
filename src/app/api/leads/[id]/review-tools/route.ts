import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowedFeatures } from "@/lib/features";
import { apiUser, fail, unauthorized } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

function city(address: string | null) {
  const parts = (address ?? "").split(",").map((p) => p.trim()).filter((p) => p && !/^(pakistan|\d{4,6})$/i.test(p));
  return parts.length ? parts[parts.length - 1] : "";
}

export async function GET(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { reviewToken: true, monitorWatchId: true } });
  if (!lead) return fail("Not found.", 404);
  const feedback = await db.feedback.findMany({ where: { leadId: id, userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json({ reviewPath: lead.reviewToken ? `/review/${lead.reviewToken}` : null, monitoring: Boolean(lead.monitorWatchId), feedback });
}

/** POST { action: "link" | "monitor-on" | "monitor-off" } */
export async function POST(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!(await allowedFeatures(user)).includes("reviews")) return fail("Review tools aren't part of your plan.", 402);
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId } });
  if (!lead) return fail("Not found.", 404);
  const b = await req.json().catch(() => ({}));

  if (b?.action === "link") {
    const token = lead.reviewToken ?? randomBytes(9).toString("base64url");
    if (!lead.reviewToken) await db.lead.update({ where: { id }, data: { reviewToken: token } });
    return NextResponse.json({ reviewPath: `/review/${token}` });
  }
  if (b?.action === "monitor-on") {
    if (lead.monitorWatchId) return NextResponse.json({ ok: true });
    const watch = await db.watch.create({
      data: {
        userId: user.wsId,
        name: `Review monitor: ${lead.title}`,
        keywords: JSON.stringify([`${lead.title} ${city(lead.address)}`.trim()]),
        depth: 1,
        everyDays: 7,
        autoCheck: false,
        nextRunAt: new Date(Date.now() + 7 * 86400_000),
      },
    });
    await db.lead.update({ where: { id }, data: { monitorWatchId: watch.id } });
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "monitor-off") {
    if (lead.monitorWatchId) await db.watch.deleteMany({ where: { id: lead.monitorWatchId, userId: user.wsId } });
    await db.lead.update({ where: { id }, data: { monitorWatchId: null } });
    return NextResponse.json({ ok: true });
  }
  return fail("Unknown action.");
}
