import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** PATCH { action: "stop" | "replied" } — ends a lead's sequence and cancels its queued emails. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const status = b?.action === "replied" ? "REPLIED" : "STOPPED";
  const r = await db.sequenceEnrollment.updateMany({ where: { id, userId: user.wsId, status: "ACTIVE" }, data: { status, endedAt: new Date() } });
  if (r.count === 0) return fail("This sequence isn't running for that lead.", 404);
  await db.emailMessage.updateMany({ where: { enrollmentId: id, status: "QUEUED" }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true });
}
