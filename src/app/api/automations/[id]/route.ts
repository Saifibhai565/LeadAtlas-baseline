import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can change automations.", 403);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (typeof b?.active !== "boolean") return fail("Nothing to change.");
  const r = await db.automation.updateMany({ where: { id, userId: user.wsId }, data: { active: b.active } });
  if (r.count === 0) return fail("Not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.automation.deleteMany({ where: { id, userId: user.wsId } });
  return NextResponse.json({ ok: true });
}
