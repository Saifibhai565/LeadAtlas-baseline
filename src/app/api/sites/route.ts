import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowedFeatures } from "@/lib/features";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "site";
}

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const sites = await db.site.findMany({
    where: { userId: user.wsId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true, customDomain: true, published: true, views: true, leadId: true, updatedAt: true },
  });
  return NextResponse.json({ sites, target: process.env.WHITELABEL_TARGET || null });
}

/** POST { leadId } — turns the lead's AI demo into a website you can publish. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!(await allowedFeatures(user)).includes("sites")) return fail("Websites and hosting aren't part of your plan.", 402);
  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead?.demoHtml) return fail("Make a website demo for this lead first.");
  if ((await db.site.count({ where: { userId: user.wsId } })) >= 200) return fail("You can have up to 200 websites.");
  const existing = await db.site.findFirst({ where: { userId: user.wsId, leadId: lead.id } });
  if (existing) return NextResponse.json({ id: existing.id });
  let slug = slugify(lead.title);
  for (let i = 2; await db.site.findUnique({ where: { slug } }); i++) slug = `${slugify(lead.title)}-${i}`;
  const site = await db.site.create({ data: { userId: user.wsId, leadId: lead.id, name: lead.title, slug, html: lead.demoHtml } });
  return NextResponse.json({ id: site.id }, { status: 201 });
}
