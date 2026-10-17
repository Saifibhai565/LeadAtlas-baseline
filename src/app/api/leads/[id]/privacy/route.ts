import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";

/**
 * POST { action:"forget" } — a privacy (GDPR-style) request: removes a business's personal
 * contact details (emails, phones, owner name, socials) but keeps the record so you know not to
 * contact them again, and adds them to the suppression list.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  const b = await req.json().catch(() => ({}));
  if (b?.action !== "forget") return fail("Unknown action.");

  // Suppress every email so they're never contacted again
  for (const e of (lead.emails ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
    await db.suppression.upsert({ where: { userId_email: { userId: user.wsId, email: e } }, create: { userId: user.wsId, email: e, reason: "MANUAL" }, update: {} }).catch(() => undefined);
  }
  await db.lead.update({
    where: { id },
    data: { emails: null, phone: null, extraPhones: null, ownerName: null, socials: null, intel: null, details: null, aiMessage: null, optIn: false },
  });
  await logActivity(user.id, id, "NOTE", "Personal contact details removed on a privacy request.");
  return NextResponse.json({ ok: true });
}
