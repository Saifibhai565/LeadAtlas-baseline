import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const entries = await db.auditLog.findMany({
    where: q ? { OR: [{ action: { contains: q } }, { detail: { contains: q } }, { actorEmail: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ entries });
}
