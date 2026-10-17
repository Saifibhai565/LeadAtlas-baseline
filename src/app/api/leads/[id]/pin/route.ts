import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** POST { pinned } — star or unstar a lead. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const r = await db.lead.updateMany({ where: { id, userId: user.wsId }, data: { pinned: Boolean(b?.pinned) } });
  if (r.count === 0) return fail("Lead not found.", 404);
  return NextResponse.json({ ok: true });
}
