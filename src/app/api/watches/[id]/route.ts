import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { tick } from "@/lib/scheduler";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { active?: boolean, runNow?: true } */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: { active?: boolean; nextRunAt?: Date } = {};
  if (typeof b?.active === "boolean") data.active = b.active;
  if (b?.runNow) data.nextRunAt = new Date();
  const r = await db.watch.updateMany({ where: { id, userId: user.wsId }, data });
  if (r.count === 0) return fail("Watch not found.", 404);
  if (b?.runNow) await tick(true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const r = await db.watch.deleteMany({ where: { id, userId: user.wsId } });
  if (r.count === 0) return fail("Watch not found.", 404);
  return NextResponse.json({ ok: true });
}
