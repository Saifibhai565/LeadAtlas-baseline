import { NextResponse } from "next/server";
import { adminLeadWhere } from "@/lib/admin-leads";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Every lead from every customer, with filters and paging. */
export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const p = new URL(req.url).searchParams;
  const page = Math.max(1, Number(p.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(10, Number(p.get("pageSize")) || 50));
  const where = adminLeadWhere(p);

  const [items, total, owners] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        phone: true,
        emails: true,
        website: true,
        address: true,
        rating: true,
        reviewCount: true,
        status: true,
        source: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.lead.count({ where }),
    p.get("withOwners") === "1"
      ? db.user.findMany({
          where: { ownerId: null, leads: { some: {} } },
          select: { id: true, name: true, email: true, _count: { select: { leads: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
  ]);
  return NextResponse.json({ items, total, page, pageSize, owners });
}
