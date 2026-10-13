import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { isSuppressed, parseSteps } from "@/lib/outreach";
import { outreachBlocked } from "@/lib/outreach-route";
import { tick } from "@/lib/scheduler";

/** POST { leadIds, sequenceId, mailboxId } — starts the sequence for leads that have an email. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;

  const b = await req.json().catch(() => ({}));
  const leadIds: string[] = Array.isArray(b?.leadIds) ? b.leadIds.map(String).slice(0, 1000) : [];
  const [seq, mailbox] = await Promise.all([
    db.sequence.findFirst({ where: { id: String(b?.sequenceId ?? ""), userId: user.wsId } }),
    db.mailbox.findFirst({ where: { id: String(b?.mailboxId ?? ""), userId: user.wsId } }),
  ]);
  if (!seq) return fail("Choose a sequence.");
  if (!mailbox) return fail("Choose a mailbox to send from.");
  if (!mailbox.active) return fail("That mailbox is paused. Switch it back on in Outreach.");
  if (leadIds.length === 0) return fail("Select some leads.");

  const steps = parseSteps(seq.steps);
  const leads = await db.lead.findMany({
    where: { id: { in: leadIds }, userId: user.wsId },
    select: { id: true, emails: true, enrollments: { where: { sequenceId: seq.id }, select: { id: true } } },
  });

  let added = 0;
  let noEmail = 0;
  let already = 0;
  let unsubscribed = 0;
  // Spread first emails out so a big batch doesn't all go at once
  let offset = 0;
  for (const l of leads) {
    const email = (l.emails ?? "").split(",").map((e) => e.trim()).find((e) => e.includes("@"));
    if (!email) {
      noEmail++;
      continue;
    }
    if (l.enrollments.length) {
      already++;
      continue;
    }
    if (await isSuppressed(user.wsId, email)) {
      unsubscribed++;
      continue;
    }
    await db.sequenceEnrollment.create({
      data: {
        userId: user.wsId,
        sequenceId: seq.id,
        leadId: l.id,
        mailboxId: mailbox.id,
        nextAt: new Date(Date.now() + (steps[0]?.delayDays ?? 0) * 86400_000 + offset * 1000),
      },
    });
    offset += 5;
    added++;
  }
  tick(true).catch(() => undefined);
  return NextResponse.json({ added, noEmail, already, unsubscribed });
}
