import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** Owner removes a member. Their history stays; they can no longer sign in. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can remove people.", 403);
  const { id } = await params;
  const r = await db.user.updateMany({ where: { id, ownerId: user.wsId }, data: { blocked: true } });
  if (r.count === 0) return fail("Team member not found.", 404);
  await db.lead.updateMany({ where: { userId: user.wsId, assignedToId: id }, data: { assignedToId: null } });
  return NextResponse.json({ ok: true });
}
