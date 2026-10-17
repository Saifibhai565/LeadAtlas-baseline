import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b?.active === "boolean") data.active = b.active;
  if (b?.everyDays != null) data.everyDays = Math.min(30, Math.max(1, Math.round(Number(b.everyDays))));
  const r = await db.competitorWatch.updateMany({ where: { id, userId: user.wsId }, data });
  if (r.count === 0) return fail("Not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.competitorWatch.deleteMany({ where: { id, userId: user.wsId } });
  return NextResponse.json({ ok: true });
}
