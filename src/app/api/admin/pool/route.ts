import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";
import { poolSettings } from "@/lib/pool";
import { setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

function city(address: string | null) {
  const parts = (address ?? "").split(",").map((p) => p.trim()).filter((p) => p && !/^(pakistan|united states|usa|uk|\d{4,6})$/i.test(p));
  return parts.length ? parts[parts.length - 1].replace(/\s*\d{4,6}$/, "").replace(/\s+[A-Z]{2}$/, "") : "Unknown";
}

/** The shared data pool: size, freshness, top cities and categories, reuse. */
export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const cfg = await poolSettings();
  const since = new Date(Date.now() - cfg.days * 86400_000);
  const [total, fresh, hits, rows] = await Promise.all([
    db.placeCache.count(),
    db.placeCache.count({ where: { updatedAt: { gte: since } } }),
    db.placeCache.aggregate({ _sum: { hits: true } }),
    db.placeCache.findMany({ select: { category: true, address: true }, take: 50000 }),
  ]);
  const cities = new Map<string, number>();
  const cats = new Map<string, number>();
  for (const r of rows) {
    const c = city(r.address);
    cities.set(c, (cities.get(c) ?? 0) + 1);
    if (r.category) cats.set(r.category, (cats.get(r.category) ?? 0) + 1);
  }
  const top = (m: Map<string, number>) => Array.from(m, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  return NextResponse.json({ settings: cfg, total, fresh, stale: total - fresh, reused: hits._sum.hits ?? 0, cities: top(cities), categories: top(cats) });
}

/** PATCH { enabled?, days? } — DELETE ?scope=stale|all clears the pool (customers' leads are not touched). */
export async function PATCH(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  if (typeof b?.enabled === "boolean") await setSetting("pool_enabled", b.enabled ? "1" : "0");
  if (b?.days != null) await setSetting("pool_days", String(Math.max(1, Math.min(3650, Math.round(Number(b.days)) || 90))));
  await audit(admin, "pool.settings", null, JSON.stringify(b));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const scope = new URL(req.url).searchParams.get("scope");
  const cfg = await poolSettings();
  const r = await db.placeCache.deleteMany({ where: scope === "all" ? {} : { updatedAt: { lt: new Date(Date.now() - cfg.days * 86400_000) } } });
  await audit(admin, "pool.clear", null, `${scope}: ${r.count}`);
  return NextResponse.json({ deleted: r.count });
}
