import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { OSM_CATEGORIES, osmSearch } from "@/lib/osm";
import { allow } from "@/lib/ratelimit";
import { allowedFeatures } from "@/lib/features";
import { scoreLead } from "@/lib/score";
import { recomputeSignals } from "@/lib/signals-server";

export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ categories: Object.entries(OSM_CATEGORIES).map(([key, v]) => ({ key, label: v.label })) });
}

/** POST { city, category, check? } — saves businesses from OpenStreetMap. 1 credit per new lead. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!(await allowedFeatures(user)).includes("osm")) return fail("OpenStreetMap search isn't part of your plan.", 402);
  if (!allow(`osm:${user.wsId}`, 10, 3600_000)) return fail("You've run 10 OpenStreetMap searches this hour. Try again later.", 429);
  const b = await req.json().catch(() => ({}));
  const city = String(b?.city ?? "").trim();
  if (city.length < 2) return fail("Enter a city, like Lahore.");
  let found;
  try {
    found = await osmSearch(city, String(b?.category ?? ""));
  } catch (err) {
    return fail(err instanceof Error ? err.message : "OpenStreetMap search failed.", 502);
  }
  if (found.length === 0) return fail(`Nothing found. Check the city's spelling as it appears on OpenStreetMap (e.g. “Lahore”, “Karachi”).`);

  const existing = await db.lead.findMany({ where: { userId: user.wsId, placeKey: { in: found.map((f) => f.placeKey) } }, select: { placeKey: true } });
  const known = new Set(existing.map((e) => e.placeKey));
  const owner = await db.user.findUnique({ where: { id: user.wsId }, select: { credits: true } });
  const fresh = found.filter((f) => !known.has(f.placeKey)).slice(0, Math.max(0, owner?.credits ?? 0));
  const check = b?.check !== false;

  await db.$transaction([
    db.lead.createMany({
      data: fresh.map((f) => ({
        ...f,
        title: f.title!,
        userId: user.wsId,
        source: "OSM",
        enrichStatus: check && f.website ? "QUEUED" : "NONE",
        score: scoreLead(f),
      })),
    }),
    db.user.update({ where: { id: user.wsId }, data: { credits: { decrement: fresh.length } } }),
  ]);
  if (check) kickEnrichment();
  recomputeSignals(user.wsId).catch(() => undefined);
  return NextResponse.json({ found: found.length, saved: fresh.length, already: known.size });
}
