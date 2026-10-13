import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { tick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const rc = await db.rankCheck.findFirst({ where: { id, userId: user.wsId } });
  if (!rc) return fail("Not found.", 404);
  if (rc.status === "RUNNING") tick().catch(() => undefined);
  return NextResponse.json({ check: { ...rc, points: JSON.parse(rc.points) } });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.rankCheck.deleteMany({ where: { id, userId: user.wsId } });
  return NextResponse.json({ ok: true });
}
