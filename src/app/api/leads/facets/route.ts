import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Categories with counts, for the category filter. */
export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();

  const rows = await db.lead.groupBy({
    by: ["category"],
    where: { userId: user.wsId, category: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
    take: 200,
  });
  const tagged = await db.lead.findMany({ where: { userId: user.wsId, tags: { not: null } }, select: { tags: true }, take: 10000 });
  const tagCounts = new Map<string, number>();
  for (const t of tagged) for (const tag of (t.tags ?? "").split(",").filter(Boolean)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  const tags = Array.from(tagCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 100);
  const techRows = await db.lead.findMany({ where: { userId: user.wsId, OR: [{ tech: { not: null } }, { signals: { not: null } }] }, select: { tech: true, signals: true }, take: 20000 });
  const techCounts = new Map<string, number>();
  const signalCounts = new Map<string, number>();
  for (const r of techRows) {
    for (const t of (r.tech ?? "").split(",").map((x) => x.trim()).filter(Boolean)) techCounts.set(t, (techCounts.get(t) ?? 0) + 1);
    for (const sg of (r.signals ?? "").split(",").filter(Boolean)) signalCounts.set(sg, (signalCounts.get(sg) ?? 0) + 1);
  }
  return NextResponse.json({
    categories: rows.map((r) => ({ name: r.category as string, count: r._count._all })),
    tags,
    tech: Array.from(techCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    signals: Object.fromEntries(signalCounts),
  });
}
