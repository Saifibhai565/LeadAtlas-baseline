import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowedFeatures } from "@/lib/features";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { startRankCheck } from "@/lib/rank";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const checks = await db.rankCheck.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ checks: checks.map((c) => ({ ...c, points: JSON.parse(c.points) })) });
}

/** POST { leadId, keyword, size: 3|5, spacingKm } — 1 credit per grid point. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!(await allowedFeatures(user)).includes("rank")) return fail("The rank tracker isn't part of your plan.", 402);
  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Choose a business from your leads.");
  if (lead.latitude == null || lead.longitude == null) return fail("This lead has no map location.");
  const keyword = String(b?.keyword ?? "").trim().slice(0, 100);
  if (keyword.length < 3) return fail("Enter what customers search, like “dentist”.");
  const size = Number(b?.size) === 5 ? 5 : 3;
  const spacingKm = Math.min(5, Math.max(0.3, Number(b?.spacingKm) || 1));
  const cost = size * size;
  const owner = await db.user.findUnique({ where: { id: user.wsId }, select: { credits: true } });
  if ((owner?.credits ?? 0) < cost) return fail(`A ${size}x${size} check uses ${cost} credits. You don't have enough.`, 402);
  try {
    const rc = await startRankCheck({
      wsId: user.wsId,
      leadId: lead.id,
      keyword,
      targetName: lead.title,
      targetKey: lead.placeKey.startsWith("osm|") || lead.placeKey.includes("|") ? null : lead.placeKey,
      lat: lead.latitude,
      lng: lead.longitude,
      size,
      spacingKm,
    });
    await db.user.update({ where: { id: user.wsId }, data: { credits: { decrement: cost } } });
    return NextResponse.json({ id: rc.id }, { status: 201 });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Couldn't start the check.", 503);
  }
}
