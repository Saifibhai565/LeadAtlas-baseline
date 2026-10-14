import { NextResponse } from "next/server";
import { kickBulkSender } from "@/lib/bulk-sender";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** PATCH { action: "pause" | "resume" | "cancel" } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await db.emailBatch.findFirst({ where: { id, userId: user.wsId } });
  if (!b) return fail("Not found.", 404);
  const body = await req.json().catch(() => ({}));
  if (body?.action === "pause") await db.emailBatch.update({ where: { id }, data: { status: "PAUSED" } });
  else if (body?.action === "resume") {
    await db.emailBatch.update({ where: { id }, data: { status: "ACTIVE" } });
    kickBulkSender();
  } else if (body?.action === "cancel") {
    await db.emailMessage.updateMany({ where: { batchId: id, status: "QUEUED" }, data: { status: "CANCELLED" } });
    await db.emailBatch.update({ where: { id }, data: { status: "CANCELLED" } });
  } else return fail("Unknown action.");
  return NextResponse.json({ ok: true });
}
