import "server-only";
import { db } from "./db";
import { kickEnrichment } from "./enrich";
import { leadPrice } from "./wallet";
import { adjustWallet } from "./wallet";
import { scoreLead } from "./score";
import { recomputeSignals } from "./signals-server";

const PUBLIC = ["title", "category", "address", "phone", "website", "emails", "rating", "reviewCount", "latitude", "longitude", "mapsUrl", "priceRange", "description", "openHours", "thumbnail", "reviews", "ratingDist", "lowReviews", "popularTimes", "details"] as const;

/** How many businesses in the data bank match a query, that this account doesn't already have. */
export async function countAvailable(wsId: string, keyword: string) {
  const { what, where } = splitQuery(keyword);
  if (what.length < 2) return { total: 0, newCount: 0 };
  const words = what.split(/\s+/).filter((w) => w.length >= 3).slice(0, 3);
  const matches = await db.placeCache.findMany({
    where: {
      AND: [
        { OR: [{ category: { contains: what } }, { title: { contains: what } }, ...words.map((w) => ({ category: { contains: w } }))] },
        ...(where ? [{ address: { contains: where } }] : []),
      ],
    },
    select: { placeKey: true },
    take: 10000,
  });
  const have = new Set(
    (await db.lead.findMany({ where: { userId: wsId, placeKey: { in: matches.map((m) => m.placeKey) } }, select: { placeKey: true } })).map((l) => l.placeKey),
  );
  return { total: matches.length, newCount: matches.filter((m) => !have.has(m.placeKey)).length };
}

function splitQuery(k: string) {
  const m = k.trim().match(/^(.*)\s+(?:in|near|at)\s+(.+)$/i);
  return { what: (m ? m[1] : k).trim().replace(/s$/i, ""), where: m ? m[2].trim().split(",")[0].trim() : null };
}

/** Buys up to `want` matching businesses from the bank, charging the wallet. */
export async function buyLeads(wsId: string, keyword: string, want: number) {
  const { price, currency } = await leadPrice();
  const { what, where } = splitQuery(keyword);
  const words = what.split(/\s+/).filter((w) => w.length >= 3).slice(0, 3);
  const matches = await db.placeCache.findMany({
    where: {
      AND: [
        { OR: [{ category: { contains: what } }, { title: { contains: what } }, ...words.map((w) => ({ category: { contains: w } }))] },
        ...(where ? [{ address: { contains: where } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 20000,
  });
  const have = new Set(
    (await db.lead.findMany({ where: { userId: wsId, placeKey: { in: matches.map((m) => m.placeKey) } }, select: { placeKey: true } })).map((l) => l.placeKey),
  );
  const fresh = matches.filter((m) => !have.has(m.placeKey)).slice(0, want);
  if (fresh.length === 0) throw new Error("No new businesses match that in the data bank yet.");

  const cost = fresh.length * price;
  const wallet = await db.user.findUnique({ where: { id: wsId }, select: { walletBalance: true } });
  if ((wallet?.walletBalance ?? 0) < cost) {
    const afford = price > 0 ? Math.floor((wallet?.walletBalance ?? 0) / price) : fresh.length;
    throw new Error(`Not enough balance. ${afford} leads cost ${currency} ${afford * price}; your balance is ${currency} ${wallet?.walletBalance ?? 0}. Top up or buy fewer.`);
  }

  const job = await db.job.create({
    data: { userId: wsId, engineJobId: `buy_${Date.now().toString(36)}`, name: `Purchased: ${keyword}`, keywords: JSON.stringify([keyword]), lang: "en", depth: 1, status: "DONE", finishedAt: new Date(), autoCheck: true },
  });
  await db.lead.createMany({
    data: fresh.map((r) => {
      const d = JSON.parse(r.data) as Record<string, unknown>;
      const lead = Object.fromEntries(PUBLIC.map((k) => [k, d[k] ?? null])) as Record<string, unknown>;
      return { ...lead, title: r.title, placeKey: r.placeKey, userId: wsId, jobId: job.id, source: "BANK", enrichStatus: lead.website ? "QUEUED" : "NONE", score: scoreLead(lead as Parameters<typeof scoreLead>[0]) };
    }) as never,
  });
  await db.placeCache.updateMany({ where: { placeKey: { in: fresh.map((r) => r.placeKey) } }, data: { hits: { increment: 1 } } });
  if (cost > 0) await adjustWallet(wsId, -cost, "purchase", `${fresh.length} leads: ${keyword}`);
  await db.leadPurchase.create({ data: { userId: wsId, query: keyword.slice(0, 120), count: fresh.length, price: cost } });
  kickEnrichment();
  recomputeSignals(wsId).catch(() => undefined);
  return { bought: fresh.length, cost, currency };
}
