import { NextResponse } from "next/server";
import { kickBulkSender } from "@/lib/bulk-sender";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { outreachBlocked } from "@/lib/outreach-route";
import { getPlatformSmtp } from "@/lib/platform-sender";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** Mailboxes, sending server info and bulk sends with live counts. */
export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const [boxes, batches, platform] = await Promise.all([
    db.mailbox.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "asc" } }),
    db.emailBatch.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 30 }),
    getPlatformSmtp(),
  ]);
  const mailboxes = await Promise.all(
    boxes.map(async (m) => ({
      id: m.id,
      label: m.label,
      fromName: m.fromName,
      fromEmail: m.fromEmail,
      replyTo: m.replyTo,
      platform: m.platform,
      active: m.active,
      lastError: m.lastError,
      dailyLimit: m.dailyLimit,
      gapSeconds: m.gapSeconds,
      sendFromHour: m.sendFromHour,
      sendToHour: m.sendToHour,
      sentToday: await db.emailMessage.count({ where: { mailboxId: m.id, status: "SENT", sentAt: { gte: dayAgo } } }),
    })),
  );
  const withCounts = await Promise.all(
    batches.map(async (b) => {
      const groups = await db.emailMessage.groupBy({ by: ["status"], where: { batchId: b.id }, _count: { _all: true } });
      const c = Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Record<string, number>;
      return { ...b, sent: c.SENT ?? 0, failed: c.FAILED ?? 0, skipped: (c.SKIPPED ?? 0) + (c.CANCELLED ?? 0), queued: (c.QUEUED ?? 0) + (c.SENDING ?? 0) };
    }),
  );
  if (batches.some((b) => b.status === "ACTIVE")) kickBulkSender();
  return NextResponse.json({
    mailboxes,
    batches: withCounts,
    allowed: user.canUseOutreach,
    platform: platform?.enabled ? { domains: platform.domains, defaultFrom: platform.defaultFrom, dailyLimit: platform.dailyLimit } : null,
  });
}

/** Parses "email", "email, name" or "Name <email>" lines. */
function parseList(text: string) {
  const out = new Map<string, string>();
  for (const raw of text.split(/[\n;]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(EMAIL_RE);
    if (!m) continue;
    const email = m[0].toLowerCase();
    let name = line.replace(m[0], "").replace(/[<>,"]/g, " ").replace(/\s+/g, " ").trim();
    if (name.length > 80) name = name.slice(0, 80);
    if (!out.has(email)) out.set(email, name);
  }
  return out;
}

/** POST { mailboxId, name, subject, body, fromName?, replyTo?, list } — queues a bulk send. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const mb = await db.mailbox.findFirst({ where: { id: String(b?.mailboxId ?? ""), userId: user.wsId } });
  if (!mb) return fail("Choose a mailbox to send from.");
  if (!mb.active) return fail("That mailbox is paused. Switch it on first.");
  const subject = String(b?.subject ?? "").trim().slice(0, 200);
  const body = String(b?.body ?? "").trim().slice(0, 20000);
  if (!subject) return fail("Add a subject.");
  if (!body) return fail("Write the message.");
  const list = parseList(String(b?.list ?? ""));
  if (list.size === 0) return fail("Paste at least one email address.");
  if (list.size > 20000) return fail("Up to 20,000 addresses per send. Split the list.");
  const replyTo = String(b?.replyTo ?? "").trim();
  if (replyTo && !EMAIL_RE.test(replyTo)) return fail("The reply-to address doesn't look right.");

  const suppressed = new Set(
    (await db.suppression.findMany({ where: { userId: user.wsId, email: { in: Array.from(list.keys()) } }, select: { email: true } })).map((s) => s.email),
  );
  const rows = Array.from(list).filter(([email]) => !suppressed.has(email));
  if (rows.length === 0) return fail("Everyone on this list has unsubscribed or bounced before.");

  const batch = await db.emailBatch.create({
    data: {
      userId: user.wsId,
      mailboxId: mb.id,
      name: String(b?.name ?? "").trim().slice(0, 80) || subject.slice(0, 60),
      subject,
      fromName: String(b?.fromName ?? "").trim().slice(0, 80) || null,
      replyTo: replyTo || null,
      total: rows.length,
    },
  });
  const fill = (t: string, email: string, name: string) =>
    t.replace(/\{\{\s*name\s*\}\}/gi, name || "there").replace(/\{\{\s*email\s*\}\}/gi, email).replace(/\{\{\s*first_name\s*\}\}/gi, (name || "there").split(" ")[0]);
  for (let i = 0; i < rows.length; i += 1000) {
    await db.emailMessage.createMany({
      data: rows.slice(i, i + 1000).map(([email, name]) => ({
        userId: user.wsId,
        mailboxId: mb.id,
        batchId: batch.id,
        toEmail: email,
        subject: fill(subject, email, name),
        body: fill(body, email, name),
      })),
    });
  }
  kickBulkSender();
  return NextResponse.json({ id: batch.id, queued: rows.length, skipped: list.size - rows.length }, { status: 201 });
}
