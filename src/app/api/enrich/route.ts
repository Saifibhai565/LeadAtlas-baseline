import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

const ISSUES = ["SITE_DOWN", "NO_HTTPS", "NOT_MOBILE", "SLOW", "NO_DESCRIPTION", "NO_TITLE"] as const;

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = { userId: user.wsId };

  const [withWebsite, noWebsite, checked, queued, socials, validEmails, issueCounts] = await Promise.all([
    db.lead.count({ where: { ...u, website: { not: null } } }),
    db.lead.count({ where: { ...u, website: null } }),
    db.lead.count({ where: { ...u, enrichStatus: "DONE" } }),
    db.lead.count({ where: { ...u, enrichStatus: { in: ["QUEUED", "RUNNING"] } } }),
    db.lead.count({ where: { ...u, socials: { not: null } } }),
    db.lead.count({ where: { ...u, emailStatus: "VALID" } }),
    Promise.all(ISSUES.map((i) => db.lead.count({ where: { ...u, auditIssues: { contains: i } } }))),
  ]);
  const unchecked = await db.lead.count({
    where: { ...u, website: { not: null }, enrichStatus: { in: ["NONE", "FAILED"] } },
  });
  if (queued > 0) kickEnrichment(); // resume after a restart

  // Where the openings are: group by area (the part of the address before the city)
  const rows = await db.lead.findMany({ where: u, select: { address: true, website: true, auditScore: true }, take: 20000 });
  const areas = new Map<string, { total: number; noSite: number; weakSite: number }>();
  for (const r of rows) {
    const parts = (r.address ?? "").split(",").map((p) => p.trim()).filter((p) => p && !/^(pakistan|\d{4,6})$/i.test(p));
    if (parts.length === 0) continue;
    const area = parts.length >= 3 ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}` : parts[parts.length - 1];
    const e = areas.get(area) ?? { total: 0, noSite: 0, weakSite: 0 };
    e.total++;
    if (!r.website) e.noSite++;
    else if (r.auditScore != null && r.auditScore < 50) e.weakSite++;
    areas.set(area, e);
  }
  const topAreas = Array.from(areas, ([area, e]) => ({ area, ...e, openings: e.noSite + e.weakSite }))
    .filter((a) => a.total >= 3)
    .sort((a, b) => b.openings - a.openings)
    .slice(0, 12);

  return NextResponse.json({
    withWebsite,
    noWebsite,
    checked,
    queued,
    unchecked,
    socials,
    validEmails,
    issues: Object.fromEntries(ISSUES.map((k, i) => [k, issueCounts[i]])),
    areas: topAreas,
  });
}

/** POST { ids?: string[] }  — without ids, queues every unchecked lead that has a website. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const ids: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String).slice(0, 5000) : null;
  if (ids && ids.length === 0) return fail("Select at least one lead.");

  const r = await db.lead.updateMany({
    where: ids
      ? { userId: user.wsId, id: { in: ids }, enrichStatus: { notIn: ["QUEUED", "RUNNING"] } }
      : { userId: user.wsId, website: { not: null }, enrichStatus: { in: ["NONE", "FAILED"] } },
    data: { enrichStatus: "QUEUED" },
  });
  if (r.count > 0) kickEnrichment();
  return NextResponse.json({ queued: r.count });
}
