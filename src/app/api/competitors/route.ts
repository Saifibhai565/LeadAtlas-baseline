import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiBlocked } from "@/lib/ai-route";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { tick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const watches = await db.competitorWatch.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    watches: watches.map((w) => ({ ...w, lastChange: w.lastChange ? JSON.parse(w.lastChange) : null })),
  });
}

/** POST { name, url, everyDays } — watches a competitor's page for changes. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim().slice(0, 80);
  let url = String(b?.url ?? "").trim();
  if (!name) return fail("Name the competitor.");
  try {
    url = new URL(url.startsWith("http") ? url : `https://${url}`).toString();
  } catch {
    return fail("Enter a valid web address.");
  }
  if ((await db.competitorWatch.count({ where: { userId: user.wsId } })) >= 50) return fail("You can watch up to 50 pages.");
  const everyDays = Math.min(30, Math.max(1, Math.round(Number(b?.everyDays) || 7)));
  const w = await db.competitorWatch.create({ data: { userId: user.wsId, name, url, everyDays } });
  tick().catch(() => undefined); // take the first snapshot soon
  return NextResponse.json({ id: w.id }, { status: 201 });
}
