import { NextResponse } from "next/server";
import { kickBulkSms } from "@/lib/bulk-sms";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await db.smsBatch.findFirst({ where: { id, userId: user.wsId } });
  if (!b) return fail("Not found.", 404);
  const body = await req.json().catch(() => ({}));
  if (body?.action === "pause") await db.smsBatch.update({ where: { id }, data: { status: "PAUSED" } });
  else if (body?.action === "resume") {
    await db.smsBatch.update({ where: { id }, data: { status: "ACTIVE" } });
    kickBulkSms();
  } else if (body?.action === "cancel") {
    await db.smsMessage.updateMany({ where: { batchId: id, status: "QUEUED" }, data: { status: "FAILED", error: "Cancelled" } });
    await db.smsBatch.update({ where: { id }, data: { status: "CANCELLED" } });
  } else return fail("Unknown action.");
  return NextResponse.json({ ok: true });
}
