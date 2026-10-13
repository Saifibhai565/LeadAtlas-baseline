import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { scoreLead } from "@/lib/score";

/**
 * POST { rows: [{ name, phone?, email?, website?, address?, category? }], check? }
 * Your own lists are free to import (no credits). Up to 2,000 rows at a time.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const rows: Record<string, unknown>[] = Array.isArray(b?.rows) ? b.rows.slice(0, 2000) : [];
  if (rows.length === 0) return fail("There's nothing to import.");
  const check = b?.check !== false;

  const str = (v: unknown, max = 300) => {
    const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
    return s ? s.slice(0, max) : null;
  };

  const byKey = new Map<string, ReturnType<typeof build>>();
  function build(r: Record<string, unknown>) {
    const title = str(r.name, 200)!;
    const phone = str(r.phone, 40);
    const address = str(r.address);
    const email = str(r.email, 120);
    const data = {
      placeKey: `imp|${title.toLowerCase()}|${(phone ?? address ?? "").toLowerCase()}`.slice(0, 300),
      title,
      phone,
      address,
      category: str(r.category, 120),
      website: str(r.website, 500),
      emails: email && email.includes("@") ? email.toLowerCase() : null,
      source: "IMPORT",
    };
    return { ...data, score: scoreLead(data) };
  }
  for (const r of rows) {
    if (!str(r.name)) continue;
    const lead = build(r);
    if (!byKey.has(lead.placeKey)) byKey.set(lead.placeKey, lead);
  }
  const incoming = Array.from(byKey.values());
  if (incoming.length === 0) return fail("No rows had a business name.");

  const existing = await db.lead.findMany({
    where: { userId: user.wsId, placeKey: { in: incoming.map((l) => l.placeKey) } },
    select: { placeKey: true },
  });
  const known = new Set(existing.map((l) => l.placeKey));
  const fresh = incoming.filter((l) => !known.has(l.placeKey));

  await db.lead.createMany({
    data: fresh.map((l) => ({ ...l, userId: user.wsId, enrichStatus: check && l.website ? "QUEUED" : "NONE" })),
  });
  if (check && fresh.some((l) => l.website)) kickEnrichment();
  return NextResponse.json({ added: fresh.length, skipped: incoming.length - fresh.length });
}
