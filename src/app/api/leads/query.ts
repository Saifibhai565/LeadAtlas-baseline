import type { Prisma } from "@prisma/client";

export const LEAD_STATUSES = ["NEW", "CONTACTED", "INTERESTED", "WON", "LOST"] as const;

export function leadWhere(userId: string, params: URLSearchParams, actorId?: string): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { userId };
  const and: Prisma.LeadWhereInput[] = [];
  if (params.get("suggested") !== "1") and.push({ suggested: false });

  const q = params.get("q")?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { category: { contains: q } },
        { address: { contains: q } },
        { phone: { contains: q } },
        { website: { contains: q } },
        { emails: { contains: q } },
      ],
    });
  }
  if (params.get("phone") === "1") and.push({ phone: { not: null } });
  if (params.get("website") === "1") and.push({ website: { not: null } });
  if (params.get("website") === "0") and.push({ website: null });
  if (params.get("email") === "1") and.push({ emails: { not: null } });

  const tag = params.get("tag")?.trim().toLowerCase();
  if (tag) and.push({ tags: { contains: `,${tag},` } });

  const category = params.get("category");
  if (category) and.push({ category });

  const minReviews = Number(params.get("minReviews"));
  if (minReviews > 0) and.push({ reviewCount: { gte: minReviews } });

  const ids = params.get("ids");
  if (ids) and.push({ id: { in: ids.split(",").filter(Boolean).slice(0, 1000) } });

  const issue = params.get("issue");
  if (issue && /^[A-Z_]+$/.test(issue)) and.push({ auditIssues: { contains: issue } });

  if (params.get("socials") === "1") and.push({ socials: { not: null } });
  if (params.get("optIn") === "1") and.push({ optIn: true });
  if (params.get("pinned") === "1") and.push({ pinned: true });
  const signal = params.get("signal");
  if (signal && /^[A-Z_]+$/.test(signal)) and.push({ signals: { contains: signal } });
  const tech = params.get("tech")?.trim();
  if (tech) and.push({ tech: { contains: tech } });
  if (params.get("unhappy") === "1") and.push({ lowReviews: { gte: 2 } });
  if (params.get("emailValid") === "1") and.push({ emailStatus: "VALID" });
  if (params.get("checked") === "1") and.push({ enrichStatus: "DONE" });

  const source = params.get("source");
  if (source && ["MAPS", "WEB", "IMPORT", "OSM", "WHATSAPP"].includes(source)) and.push({ source });

  if (params.get("followUp") === "due") {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    and.push({ followUpAt: { lte: end } });
  }

  const assigned = params.get("assigned");
  if (assigned === "me" && actorId) and.push({ assignedToId: actorId });
  if (assigned === "none") and.push({ assignedToId: null });

  const minScore = Number(params.get("minScore"));
  if (minScore > 0) and.push({ score: { gte: minScore } });

  const minRating = Number(params.get("minRating"));
  if (minRating > 0) and.push({ rating: { gte: minRating } });

  const jobId = params.get("jobId");
  if (jobId) and.push({ jobId });

  const status = params.get("status");
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) and.push({ status });

  if (and.length) where.AND = and;
  return where;
}
