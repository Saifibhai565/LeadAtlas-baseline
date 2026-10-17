import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { recomputeSignals } from "@/lib/signals-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const leads = await db.lead.findMany({
    where: { userId: user.wsId, suggested: true },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, title: true, category: true, phone: true, website: true, address: true, rating: true, reviewCount: true, createdAt: true },
  });
  return NextResponse.json({ leads });
}

/** POST { ids?, all?, action: "accept" | "dismiss" } — accept = keep (spend 1 credit each); dismiss = delete. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const where = b?.all ? { userId: user.wsId, suggested: true } : { userId: user.wsId, suggested: true, id: { in: (Array.isArray(b?.ids) ? b.ids : []).map(String).slice(0, 2000) } };

  if (b?.action === "dismiss") {
    const r = await db.lead.deleteMany({ where });
    return NextResponse.json({ removed: r.count });
  }
  if (b?.action !== "accept") return fail("Unknown action.");

  const picked = await db.lead.findMany({ where, select: { id: true, website: true } });
  const owner = await db.user.findUnique({ where: { id: user.wsId }, select: { credits: true } });
  const canAfford = Math.min(picked.length, owner?.credits ?? 0);
  if (canAfford === 0) return fail("Not enough credits. Top up to add these leads.", 402);
  const take = picked.slice(0, canAfford);
  await db.$transaction([
    db.lead.updateMany({ where: { id: { in: take.map((l) => l.id) } }, data: { suggested: false, enrichStatus: "QUEUED" } }),
    db.user.update({ where: { id: user.wsId }, data: { credits: { decrement: canAfford } } }),
  ]);
  // leftover suggestions that we couldn't afford: leave as suggested
  kickEnrichment();
  recomputeSignals(user.wsId).catch(() => undefined);
  return NextResponse.json({ added: canAfford, skipped: picked.length - canAfford });
}
