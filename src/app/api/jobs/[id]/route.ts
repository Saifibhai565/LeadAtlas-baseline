import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** Removes a search from your list. Leads it found stay in your leads. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const removed = await db.job.deleteMany({ where: { id, userId: user.wsId } });
  if (removed.count === 0) return fail("Search not found.", 404);
  return NextResponse.json({ ok: true });
}
