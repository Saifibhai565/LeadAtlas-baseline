import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const show = new URL(req.url).searchParams.get("show") ?? "open";
  const errors = await db.errorLog.findMany({
    where: show === "all" ? {} : { resolved: false },
    orderBy: { lastSeen: "desc" },
    take: 200,
  });
  const open = await db.errorLog.count({ where: { resolved: false } });
  return NextResponse.json({ errors, open });
}

/** POST { id?, all?: true } — mark fixed (it reopens if it happens again). DELETE clears fixed ones. */
export async function POST(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const b = await req.json().catch(() => ({}));
  if (b?.all) await db.errorLog.updateMany({ where: { resolved: false }, data: { resolved: true } });
  else if (b?.id) await db.errorLog.updateMany({ where: { id: String(b.id) }, data: { resolved: true } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await apiAdmin())) return forbidden();
  const r = await db.errorLog.deleteMany({ where: { resolved: true } });
  return NextResponse.json({ deleted: r.count });
}
