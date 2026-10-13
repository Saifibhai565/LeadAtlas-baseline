import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { leadWhere } from "../query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();

  const where = leadWhere(user.wsId, new URL(req.url).searchParams, user.id);
  const points = await db.lead.findMany({
    where: { AND: [where, { latitude: { not: null } }, { longitude: { not: null } }] },
    select: {
      id: true,
      title: true,
      category: true,
      phone: true,
      website: true,
      rating: true,
      reviewCount: true,
      latitude: true,
      longitude: true,
      status: true,
      mapsUrl: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return NextResponse.json({ points });
}
