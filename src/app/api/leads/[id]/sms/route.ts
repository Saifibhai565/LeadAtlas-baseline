import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";
import { tick } from "@/lib/scheduler";

/** POST { body } — queues an SMS through the provider. Only for leads who agreed to receive messages. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  if (!lead.optIn) return fail("Mark this lead as agreed to receive messages first.", 403);
  if (!lead.phone) return fail("This lead has no phone number.");
  const owner = await db.user.findUnique({ where: { id: user.wsId }, select: { smsUrl: true } });
  if (!owner?.smsUrl) return fail("Set up an SMS provider in Settings first.");
  const b = await req.json().catch(() => ({}));
  const body = String(b?.body ?? "").trim().slice(0, 1000);
  if (!body) return fail("Write the message.");
  await db.smsMessage.create({ data: { userId: user.wsId, leadId: id, toNumber: lead.phone, body } });
  await logActivity(user.id, id, "MESSAGE", `SMS (provider): ${body}`);
  tick(true).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
