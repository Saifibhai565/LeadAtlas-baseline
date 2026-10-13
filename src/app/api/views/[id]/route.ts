import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const r = await db.savedView.deleteMany({ where: { id, userId: user.wsId } });
  if (r.count === 0) return fail("View not found.", 404);
  return NextResponse.json({ ok: true });
}
