import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** The strongest businesses of the same kind nearby, from this workspace's own leads. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  if (!lead.category || lead.latitude == null || lead.longitude == null) return NextResponse.json({ competitors: [], reason: "no-location" });

  const box = 0.06; // about 6 km
  const nearby = await db.lead.findMany({
    where: {
      userId: user.wsId,
      id: { not: lead.id },
      category: lead.category,
      latitude: { gte: lead.latitude - box, lte: lead.latitude + box },
      longitude: { gte: lead.longitude - box, lte: lead.longitude + box },
    },
    select: { id: true, title: true, rating: true, reviewCount: true, website: true, latitude: true, longitude: true },
    take: 300,
  });
  const here = { lat: lead.latitude, lng: lead.longitude };
  const ranked = nearby
    .map((n) => ({ ...n, distanceKm: km(here, { lat: n.latitude!, lng: n.longitude! }) }))
    .filter((n) => n.distanceKm <= 5 && n.rating != null)
    .sort((a, b) => (b.rating ?? 0) * Math.log10((b.reviewCount ?? 0) + 10) - (a.rating ?? 0) * Math.log10((a.reviewCount ?? 0) + 10))
    .slice(0, 3)
    .map(({ latitude: _a, longitude: _b, ...rest }) => ({ ...rest, distanceKm: Math.round(rest.distanceKm * 10) / 10 }));
  return NextResponse.json({ competitors: ranked, me: { rating: lead.rating, reviewCount: lead.reviewCount, website: lead.website } });
}
