import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET ?q=&filter=all|owners|members|paying|free|blocked|unverified|admins&page=1 */
export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim();
  const filter = params.get("filter") ?? "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const now = new Date();

  const and: object[] = [];
  if (q) and.push({ OR: [{ name: { contains: q } }, { email: { contains: q } }] });
  if (filter === "owners") and.push({ ownerId: null });
  if (filter === "members") and.push({ ownerId: { not: null } });
  if (filter === "paying") and.push({ ownerId: null, planId: { not: null }, planExpiresAt: { gt: now } });
  if (filter === "free") and.push({ ownerId: null, OR: [{ planId: null }, { planExpiresAt: { lte: now } }] });
  if (filter === "blocked") and.push({ blocked: true });
  if (filter === "unverified") and.push({ emailVerifiedAt: null });
  if (filter === "admins") and.push({ role: "ADMIN" });
  const where = and.length ? { AND: and } : {};

  const [users, total, counts] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        blocked: true,
        credits: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        planExpiresAt: true,
        ownerId: true,
        owner: { select: { name: true, email: true } },
        plan: { select: { id: true, name: true } },
        _count: { select: { leads: true, members: true } },
      },
    }),
    db.user.count({ where }),
    Promise.all([
      db.user.count(),
      db.user.count({ where: { ownerId: null } }),
      db.user.count({ where: { ownerId: { not: null } } }),
      db.user.count({ where: { ownerId: null, planId: { not: null }, planExpiresAt: { gt: now } } }),
      db.user.count({ where: { blocked: true } }),
      db.user.count({ where: { emailVerifiedAt: null } }),
    ]),
  ]);
  const [all, owners, members, paying, blocked, unverified] = counts;
  return NextResponse.json({ users, total, page, pageSize: 50, counts: { all, owners, members, paying, blocked, unverified } });
}
