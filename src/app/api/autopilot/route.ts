import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({
    where: { id: user.wsId },
    select: { autopilot: true, autopilotWhat: true, autopilotCities: true, autopilotDaily: true, autopilotAutoAdd: true, autopilotRunAt: true },
  });
  const suggestedCount = await db.lead.count({ where: { userId: user.wsId, suggested: true } });
  return NextResponse.json({ ...u, suggestedCount, isOwner: user.isOwner, aiOn: user.canUseAI });
}

/** PATCH { autopilot, what, cities, daily, autoAdd } */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can set up Autopilot.", 403);
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b?.autopilot === "boolean") data.autopilot = b.autopilot;
  if (b?.what !== undefined) data.autopilotWhat = String(b.what).trim().slice(0, 300) || null;
  if (b?.cities !== undefined) data.autopilotCities = String(b.cities).trim().slice(0, 300) || null;
  if (b?.daily != null) data.autopilotDaily = Math.min(200, Math.max(5, Math.round(Number(b.daily)) || 20));
  if (typeof b?.autoAdd === "boolean") data.autopilotAutoAdd = b.autoAdd;
  await db.user.update({ where: { id: user.wsId }, data });
  return NextResponse.json({ ok: true });
}
