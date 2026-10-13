import { apiAuth, apiError, apiJson, preflight } from "@/lib/apikey";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { scoreLead } from "@/lib/score";
import { emit, publicLead } from "@/lib/webhooks";
import { leadWhere } from "../../leads/query";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** GET /api/v1/leads?page=1&limit=100&q=&status=&category=&phone=1&website=0&minScore=60&since=ISO */
export async function GET(req: Request) {
  const auth = await apiAuth(req);
  if ("res" in auth) return auth.res;
  const params = new URL(req.url).searchParams;
  const limit = Math.min(500, Math.max(1, Number(params.get("limit")) || 100));
  const page = Math.max(1, Number(params.get("page")) || 1);
  const where = leadWhere(auth.wsId, params);
  const since = params.get("since");
  const sinceDate = since ? new Date(since) : null;
  const finalWhere = sinceDate && !Number.isNaN(sinceDate.getTime()) ? { AND: [where, { createdAt: { gte: sinceDate } }] } : where;

  const [items, total] = await Promise.all([
    db.lead.findMany({ where: finalWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    db.lead.count({ where: finalWhere }),
  ]);
  return apiJson({ data: items.map(publicLead), page, limit, total });
}

/**
 * POST /api/v1/leads  { name, phone?, email?, website?, address?, category?, mapsUrl?, check? }
 * Used by the Chrome extension. Costs 1 credit if the lead is new.
 */
export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if ("res" in auth) return auth.res;
  const b = await req.json().catch(() => ({}));
  const str = (v: unknown, max = 300) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s.slice(0, max) : null;
  };
  const title = str(b?.name, 200);
  if (!title) return apiError("A business name is required.");
  const phone = str(b?.phone, 40);
  const address = str(b?.address);
  const mapsUrl = str(b?.mapsUrl, 1000);
  const email = str(b?.email, 120);
  const placeKey = (str(b?.placeId, 200) ?? `ext|${title.toLowerCase()}|${(phone ?? address ?? "").toLowerCase()}`).slice(0, 300);

  const existing = await db.lead.findUnique({ where: { userId_placeKey: { userId: auth.wsId, placeKey } } });
  if (existing) return apiJson({ created: false, lead: publicLead(existing) });

  const owner = await db.user.findUnique({ where: { id: auth.wsId }, select: { credits: true } });
  if (!owner || owner.credits <= 0) return apiError("You're out of credits.", 402);

  const data = {
    userId: auth.wsId,
    placeKey,
    title,
    category: str(b?.category, 120),
    phone,
    emails: email && email.includes("@") ? email.toLowerCase() : null,
    website: str(b?.website, 500),
    address,
    mapsUrl,
    rating: Number.isFinite(Number(b?.rating)) && Number(b?.rating) > 0 ? Number(b.rating) : null,
    reviewCount: Number.isFinite(Number(b?.reviews)) && Number(b?.reviews) > 0 ? Math.round(Number(b.reviews)) : null,
    source: "WEB",
    sourceUrl: str(b?.sourceUrl, 1000),
  };
  const socials: Record<string, string> = {};
  const li = str(b?.linkedin, 300);
  const fb = str(b?.facebook, 300);
  if (li && /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(li)) socials.linkedin = li;
  if (fb && /^https:\/\/(www\.|m\.)?facebook\.com\//i.test(fb)) socials.facebook = fb;
  Object.assign(data, { socials: Object.keys(socials).length ? JSON.stringify(socials) : null });

  const shouldCheck = b?.check !== false && Boolean(data.website);
  const [lead] = await db.$transaction([
    db.lead.create({ data: { ...data, enrichStatus: shouldCheck ? "QUEUED" : "NONE", score: scoreLead(data) } }),
    db.user.update({ where: { id: auth.wsId }, data: { credits: { decrement: 1 } } }),
  ]);
  if (shouldCheck) kickEnrichment();
  emit(auth.wsId, "lead.created", { leads: [publicLead(lead)] }).catch(() => undefined);
  return apiJson({ created: true, lead: publicLead(lead) }, 201);
}
