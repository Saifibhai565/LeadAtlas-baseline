import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const c = await db.campaign.findFirst({ where: { id, userId: user.wsId } });
  if (!c) return fail("Campaign not found.", 404);
  const templates = JSON.parse(c.templates) as string[];

  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const [next, pending, sent, skipped, sentToday, perTemplate] = await Promise.all([
    db.campaignItem.findFirst({
      where: { campaignId: id, status: "PENDING" },
      orderBy: { position: "asc" },
      include: { lead: { select: { id: true, title: true, category: true, address: true, rating: true, reviewCount: true, website: true, status: true } } },
    }),
    db.campaignItem.count({ where: { campaignId: id, status: "PENDING" } }),
    db.campaignItem.count({ where: { campaignId: id, status: "SENT" } }),
    db.campaignItem.count({ where: { campaignId: id, status: "SKIPPED" } }),
    db.campaignItem.count({ where: { campaign: { userId: user.wsId }, status: "SENT", sentAt: { gte: dayAgo } } }),
    Promise.all(
      templates.map(async (_t, i) => {
        const [s, replied] = await Promise.all([
          db.campaignItem.count({ where: { campaignId: id, templateIndex: i, status: "SENT" } }),
          db.campaignItem.count({ where: { campaignId: id, templateIndex: i, status: "SENT", lead: { status: { in: ["INTERESTED", "WON"] } } } }),
        ]);
        return { sent: s, replied };
      }),
    ),
  ]);
  return NextResponse.json({ campaign: { ...c, templates }, next, counts: { pending, sent, skipped }, sentToday, perTemplate });
}

/** PATCH { status: "ACTIVE" | "PAUSED" } — pause or resume an automatic campaign. */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!["ACTIVE", "PAUSED"].includes(b?.status)) return fail("Unknown status.");
  const r = await db.campaign.updateMany({ where: { id, userId: user.wsId, status: { not: "DONE" } }, data: { status: b.status } });
  if (r.count === 0) return fail("Campaign not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const r = await db.campaign.deleteMany({ where: { id, userId: user.wsId } });
  if (r.count === 0) return fail("Campaign not found.", 404);
  return NextResponse.json({ ok: true });
}
