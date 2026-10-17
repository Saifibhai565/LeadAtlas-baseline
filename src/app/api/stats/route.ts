import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

const NETWORKS = ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok", "whatsapp", "pinterest", "telegram", "snapchat", "threads"];
const SIGNALS = ["BUSY", "NEW_BIZ", "SOCIAL_ONLY", "ADS", "MOBILE", "CHAIN", "DOMAIN_EXPIRING", "HAS_OWNER", "RATING_DROP", "BAD_REVIEW"];

/** Every count for the dashboard statistics panel. ?scope=all (Super Admin) counts every customer. */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const all = user.isAdmin && new URL(req.url).searchParams.get("scope") === "all";
  const base: Prisma.LeadWhereInput = all ? {} : { userId: user.wsId };
  const c = (extra: Prisma.LeadWhereInput) => db.lead.count({ where: { AND: [base, extra] } });
  const dayAgo = new Date(Date.now() - 86400_000);
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const monthAgo = new Date(Date.now() - 30 * 86400_000);
  const ws = all ? {} : { userId: user.wsId };

  const [
    total, today, week, month,
    phone, mobile, email, emailValid, emailInvalid, website, noWebsite, socialOnly, socials,
    checked, siteDown, noHttps, notMobile, slow, weakSite, hasForm, hasBooking, hasChat, hiring, unsafe,
    hot, warm, cold, q70, q40,
    withReviews, rating45, unhappy,
    optIn, followUps,
  ] = await Promise.all([
    c({}), c({ createdAt: { gte: dayAgo } }), c({ createdAt: { gte: weekAgo } }), c({ createdAt: { gte: monthAgo } }),
    c({ phone: { not: null } }), c({ signals: { contains: "MOBILE" } }), c({ emails: { not: null } }), c({ emailStatus: "VALID" }), c({ emailStatus: "INVALID" }),
    c({ website: { not: null } }), c({ website: null }), c({ signals: { contains: "SOCIAL_ONLY" } }), c({ socials: { not: null } }),
    c({ enrichStatus: "DONE" }), c({ auditIssues: { contains: "SITE_DOWN" } }), c({ auditIssues: { contains: "NO_HTTPS" } }), c({ auditIssues: { contains: "NOT_MOBILE" } }),
    c({ auditIssues: { contains: "SLOW" } }), c({ auditScore: { lt: 50 } }),
    c({ intel: { contains: '"contactForm":true' } }), c({ intel: { contains: '"booking":true' } }), c({ intel: { contains: '"liveChat":true' } }), c({ intel: { contains: '"careersUrl":"http' } }),
    c({ intel: { contains: '"unsafe":"' } }),
    c({ score: { gte: 70 } }), c({ score: { gte: 45, lt: 70 } }), c({ score: { lt: 45 } }), c({ quality: { gte: 70 } }), c({ quality: { gte: 40, lt: 70 } }),
    c({ reviewCount: { gt: 0 } }), c({ rating: { gte: 4.5 } }), c({ lowReviews: { gte: 2 } }),
    c({ optIn: true }), c({ followUpAt: { lte: new Date() }, status: { notIn: ["WON", "LOST"] } }),
  ]);
  const network = Object.fromEntries(await Promise.all(NETWORKS.map(async (n) => [n, await c({ socials: { contains: `"${n}"` } })])));
  const signal = Object.fromEntries(await Promise.all(SIGNALS.map(async (s) => [s, await c({ signals: { contains: s } })])));
  const byStatus = Object.fromEntries((await db.lead.groupBy({ by: ["status"], where: base, _count: { _all: true } })).map((g) => [g.status, g._count._all]));
  const bySource = Object.fromEntries((await db.lead.groupBy({ by: ["source"], where: base, _count: { _all: true } })).map((g) => [g.source, g._count._all]));
  const cats = (await db.lead.groupBy({ by: ["category"], where: { AND: [base, { category: { not: null } }] }, _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 10 })).map((g) => ({
    name: g.category as string,
    count: g._count._all,
  }));
  const addr = await db.lead.findMany({ where: base, select: { address: true }, take: 50000 });
  const cityMap = new Map<string, number>();
  for (const a of addr) {
    const p = (a.address ?? "").split(",").map((x) => x.trim()).filter((x) => x && !/^(pakistan|united states|usa|\d{4,6})$/i.test(x));
    const cty = p.length ? p[p.length - 1].replace(/\s*\d{4,6}$/, "") : null;
    if (cty) cityMap.set(cty, (cityMap.get(cty) ?? 0) + 1);
  }
  const cities = Array.from(cityMap, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const [searches, emailsSent, emailsOpened, campaignSent, waIn, sms, sites, rankChecks, dealValue] = await Promise.all([
    db.job.count({ where: ws }),
    db.emailMessage.count({ where: { ...ws, status: "SENT" } }),
    db.emailMessage.count({ where: { ...ws, openedAt: { not: null } } }),
    db.campaignItem.count({ where: { status: "SENT", ...(all ? {} : { campaign: { userId: user.wsId } }) } }),
    db.waMessage.count({ where: { ...ws, direction: "IN" } }),
    db.smsMessage.count({ where: { ...ws, status: "SENT" } }),
    db.site.count({ where: { ...ws, published: true } }),
    db.rankCheck.count({ where: ws }),
    db.lead.aggregate({ where: { AND: [base, { status: "WON" }] }, _sum: { dealValue: true } }),
  ]);

  return NextResponse.json({
    scope: all ? "all" : "mine",
    overview: { total, today, week, month, hot, warm, cold, searches },
    contacts: { phone, mobile, email, emailValid, emailInvalid, optIn, q70, q40, q0: total - q70 - q40 },
    websites: { website, noWebsite, socialOnly, checked, siteDown, noHttps, notMobile, slow, weakSite, hasForm, hasBooking, hasChat, hiring, unsafe },
    social: { any: socials, ...network },
    signals: signal,
    reviews: { withReviews, rating45, unhappy },
    pipeline: { ...byStatus, followUps, wonValue: dealValue._sum.dealValue ?? 0 },
    outreach: { emailsSent, emailsOpened, campaignSent, waIn, sms, sites, rankChecks },
    sources: bySource,
    categories: cats,
    cities,
  });
}
