import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const show = new URL(req.url).searchParams.get("show") ?? "PENDING";
  const deposits = await db.deposit.findMany({ where: show === "ALL" ? {} : { status: show }, orderBy: { createdAt: "desc" }, take: 100 });
  const users = await db.user.findMany({ where: { id: { in: deposits.map((d) => d.userId) } }, select: { id: true, name: true, email: true } });
  const pending = await db.deposit.count({ where: { status: "PENDING" } });
  return NextResponse.json({ deposits: deposits.map((d) => ({ ...d, user: users.find((u) => u.id === d.userId) ?? null })), pending });
}
