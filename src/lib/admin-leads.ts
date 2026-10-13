import "server-only";
import type { Prisma } from "@prisma/client";

/** Filters for the admin's view of every customer's leads. */
export function adminLeadWhere(p: URLSearchParams): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  const q = p.get("q")?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { phone: { contains: q } },
        { emails: { contains: q } },
        { website: { contains: q } },
        { address: { contains: q } },
      ],
    });
  }
  const owner = p.get("owner");
  if (owner) and.push({ userId: owner });
  const category = p.get("category")?.trim();
  if (category) and.push({ category: { contains: category } });
  const city = p.get("city")?.trim();
  if (city) and.push({ address: { contains: city } });
  const status = p.get("status");
  if (status) and.push({ status });
  const source = p.get("source");
  if (source) and.push({ source });
  if (p.get("phone") === "1") and.push({ phone: { not: null } });
  if (p.get("phone") === "0") and.push({ phone: null });
  if (p.get("email") === "1") and.push({ emails: { not: null } });
  if (p.get("email") === "0") and.push({ emails: null });
  if (p.get("website") === "1") and.push({ website: { not: null } });
  if (p.get("website") === "0") and.push({ website: null });
  const minRating = Number(p.get("minRating"));
  if (minRating > 0) and.push({ rating: { gte: minRating } });
  const from = p.get("from");
  if (from && !Number.isNaN(new Date(from).getTime())) and.push({ createdAt: { gte: new Date(`${from}T00:00:00`) } });
  const to = p.get("to");
  if (to && !Number.isNaN(new Date(to).getTime())) and.push({ createdAt: { lte: new Date(`${to}T23:59:59`) } });
  return and.length ? { AND: and } : {};
}
