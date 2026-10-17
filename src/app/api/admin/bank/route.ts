import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { tick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const [tasks, bankSize, groups] = await Promise.all([
    db.scrapeTask.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.placeCache.count(),
    db.scrapeTask.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const byStatus = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  const addedTotal = (await db.scrapeTask.aggregate({ _sum: { found: true } }))._sum.found ?? 0;
  return NextResponse.json({ tasks, bankSize, byStatus, addedTotal });
}

/** POST { keywords: string[] | string, country?, depth? } — queues one or more scrape tasks. */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const raw = Array.isArray(b?.keywords) ? b.keywords : String(b?.keywords ?? "").split("\n");
  const keywords = raw.map((k: unknown) => String(k).trim()).filter(Boolean).slice(0, 500);
  if (keywords.length === 0) return fail("Enter at least one search, like “restaurant in USA”.");
  const depth = Math.min(20, Math.max(1, Math.round(Number(b?.depth) || 5)));
  await db.scrapeTask.createMany({
    data: keywords.map((keyword: string) => ({ keyword, country: String(b?.country ?? "").trim().slice(0, 40) || null, depth })),
  });
  await audit(admin, "bank.queue", null, `${keywords.length} tasks`);
  tick().catch(() => undefined);
  return NextResponse.json({ queued: keywords.length }, { status: 201 });
}
