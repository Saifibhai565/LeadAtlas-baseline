import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const r = await db.invite.deleteMany({ where: { id, ownerId: user.wsId, usedAt: null } });
  if (r.count === 0) return fail("Invite not found.", 404);
  return NextResponse.json({ ok: true });
}
