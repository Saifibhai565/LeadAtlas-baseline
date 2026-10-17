import "server-only";
import { db } from "./db";
import { kickEnrichment } from "./enrich";
import { scoreLead } from "./score";
import { getSettings } from "./settings";
import { recomputeSignals } from "./signals-server";

/**
 * Shared data pool: every business any search has found (public Google Maps data only, never anyone's notes,
 * status or tags). A new search first takes matching businesses from the pool that this account doesn't have yet,
 * so results arrive instantly, then the engine looks for more. Nobody ever gets the same business twice.
 */
const PUBLIC = [
  "title", "category", "address", "phone", "website", "emails", "rating", "reviewCount", "latitude", "longitude", "mapsUrl",
  "priceRange", "description", "openHours", "thumbnail", "reviews", "ratingDist", "lowReviews", "popularTimes", "details",
] as const;

type PublicLead = { placeKey: string; title: string } & Partial<Record<(typeof PUBLIC)[number], unknown>>;

export async function poolSettings() {
  const s = await getSettings();
  return { enabled: s.pool_enabled === "1", days: Math.max(1, Number(s.pool_days) || 90) };
}

/** Saves (or refreshes) businesses into the pool. */
export async function saveToPool(rows: PublicLead[]) {
  if (!(await poolSettings()).enabled) return;
  for (const r of rows) {
    if (!r.placeKey || !r.title) continue;
    const data = JSON.stringify(Object.fromEntries(PUBLIC.map((k) => [k, r[k] ?? null])));
    await db.placeCache
      .upsert({
        where: { placeKey: r.placeKey },
        create: { placeKey: r.placeKey, title: String(r.title), category: (r.category as string) ?? null, address: (r.address as string) ?? null, data },
        update: { title: String(r.title), category: (r.category as string) ?? null, address: (r.address as string) ?? null, data },
      })
      .catch(() => undefined);
  }
}

/** "bakery in Lahore" -> what: bakery, where: Lahore */
export function splitKeyword(k: string) {
  const m = k.trim().match(/^(.*)\s+(?:in|near|at)\s+(.+)$/i);
  const what = (m ? m[1] : k).trim().replace(/s$/i, "");
  const where = m ? m[2].trim().split(",")[0].trim() : null;
  return { what, where };
}

/** Businesses from the pool that match the searches and that this account doesn't have yet. */
export async function takeFromPool(wsId: string, keywords: string[], limit: number) {
  const cfg = await poolSettings();
  if (!cfg.enabled || limit <= 0) return [];
  const since = new Date(Date.now() - cfg.days * 86400_000);
  const picked = new Map<string, PublicLead>();
  const per = Math.max(1, Math.ceil(limit / keywords.length));
  for (const k of keywords) {
    const { what, where } = splitKeyword(k);
    if (what.length < 3) continue;
    const words = what.split(/\s+/).filter((w) => w.length >= 3).slice(0, 3);
    const rows = await db.placeCache.findMany({
      where: {
        updatedAt: { gte: since },
        AND: [
          { OR: [{ category: { contains: what } }, { title: { contains: what } }, ...words.map((w) => ({ category: { contains: w } }))] },
          ...(where ? [{ address: { contains: where } }] : []),
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: per * 4,
    });
    const have = new Set(
      (await db.lead.findMany({ where: { userId: wsId, placeKey: { in: rows.map((r) => r.placeKey) } }, select: { placeKey: true } })).map((l) => l.placeKey),
    );
    let n = 0;
    for (const r of rows) {
      if (have.has(r.placeKey) || picked.has(r.placeKey)) continue;
      try {
        picked.set(r.placeKey, { ...(JSON.parse(r.data) as PublicLead), placeKey: r.placeKey, title: r.title });
      } catch {
        continue;
      }
      if (++n >= per || picked.size >= limit) break;
    }
    if (picked.size >= limit) break;
  }
  return Array.from(picked.values()).slice(0, limit);
}

/** Saves pool businesses as new leads for this account, under the given search, and charges 1 credit each. */
export async function addPoolLeads(wsId: string, jobId: string, rows: PublicLead[], autoCheck: boolean) {
  if (!rows.length) return 0;
  const owner = await db.user.findUnique({ where: { id: wsId }, select: { credits: true } });
  const allowed = rows.slice(0, Math.max(0, owner?.credits ?? 0));
  if (!allowed.length) return 0;
  const data = allowed.map((r) => {
    const lead = Object.fromEntries(PUBLIC.map((k) => [k, r[k] ?? null])) as Record<string, unknown>;
    return {
      ...lead,
      title: r.title,
      placeKey: r.placeKey,
      userId: wsId,
      jobId,
      source: "MAPS",
      enrichStatus: autoCheck && lead.website ? "QUEUED" : "NONE",
      score: scoreLead(lead as Parameters<typeof scoreLead>[0]),
    };
  });
  await db.$transaction([
    db.lead.createMany({ data: data as never }),
    db.user.update({ where: { id: wsId }, data: { credits: { decrement: allowed.length } } }),
    db.job.update({ where: { id: jobId }, data: { newCount: { increment: allowed.length }, resultCount: { increment: allowed.length } } }),
    db.placeCache.updateMany({ where: { placeKey: { in: allowed.map((r) => r.placeKey) } }, data: { hits: { increment: 1 } } }),
  ]);
  if (autoCheck) kickEnrichment();
  recomputeSignals(wsId).catch(() => undefined);
  return allowed.length;
}
