import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { queueEmail } from "@/lib/outreach";
import { outreachBlocked } from "@/lib/outreach-route";
import { tick } from "@/lib/scheduler";

/** POST { leadId, mailboxId, to?, subject, body } — queues a single email (sent within a couple of minutes). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const [lead, mailbox] = await Promise.all([
    db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } }),
    db.mailbox.findFirst({ where: { id: String(b?.mailboxId ?? ""), userId: user.wsId } }),
  ]);
  if (!lead) return fail("Lead not found.", 404);
  if (!mailbox) return fail("Choose a mailbox.");
  if (!mailbox.active) return fail("That mailbox is paused.");
  const to = String(b?.to ?? "").trim() || (lead.emails ?? "").split(",")[0]?.trim();
  const subject = String(b?.subject ?? "").trim();
  const body = String(b?.body ?? "").trim();
  if (!to || !to.includes("@")) return fail("This lead has no email address.");
  if (!subject) return fail("Add a subject.");
  if (!body) return fail("Write the message.");
  const msg = await queueEmail({ wsId: user.wsId, mailboxId: mailbox.id, leadId: lead.id, to, subject, body });
  if (!msg) return fail("This address has unsubscribed or bounced, so it won't be emailed.", 409);
  tick(true).catch(() => undefined);
  return NextResponse.json({ ok: true, id: msg.id });
}
