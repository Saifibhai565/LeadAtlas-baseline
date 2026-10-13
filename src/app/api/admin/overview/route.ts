import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [users, newUsers, paying, pending, revenueMonth, revenueAll, leads, searches] = await Promise.all([
    db.user.count({ where: { ownerId: null } }),
    db.user.count({ where: { ownerId: null, createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { ownerId: null, planId: { not: null }, planExpiresAt: { gt: new Date() } } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.aggregate({ where: { status: "APPROVED", reviewedAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    db.lead.count(),
    db.job.count(),
  ]);
  return NextResponse.json({
    users,
    newUsers,
    paying,
    pending,
    revenueMonth: revenueMonth._sum.amount ?? 0,
    revenueAll: revenueAll._sum.amount ?? 0,
    leads,
    searches,
  });
}
