import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";

/** POST { type: "NOTE" | "MESSAGE", body, channel? } — a MESSAGE also marks a new lead as contacted. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { status: true } });
  if (!lead) return fail("Lead not found.", 404);

  const body = await req.json().catch(() => ({}));
  const type = body?.type === "MESSAGE" ? "MESSAGE" : "NOTE";
  const text = String(body?.body ?? "").trim();
  if (!text) return fail(type === "NOTE" ? "Write a note first." : "The message is empty.");

  if (type === "MESSAGE") {
    const channel = body?.channel === "EMAIL" ? "Email" : body?.channel === "SMS" ? "SMS" : "WhatsApp";
    await logActivity(user.id, id, "MESSAGE", `${channel}: ${text}`);
    await db.lead.update({
      where: { id },
      data: { lastContactAt: new Date(), ...(lead.status === "NEW" ? { status: "CONTACTED" } : {}) },
    });
    if (lead.status === "NEW") await logActivity(user.id, id, "STATUS", "Moved from New to Contacted");
  } else {
    await logActivity(user.id, id, "NOTE", text);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
