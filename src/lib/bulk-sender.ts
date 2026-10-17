import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { decrypt } from "./crypto";
import { db } from "./db";
import { appUrl } from "./mail";
import { notify } from "./notify";
import { isSuppressed, unsubscribeUrl } from "./outreach";
import { withinWindow, zoneForAddress } from "./timezone";

/**
 * Sends bulk (pasted-list) emails continuously while there are any, one mailbox at a time,
 * respecting each mailbox's gap and daily limit. Runs inside the app process, like website checks.
 */
const g = globalThis as unknown as { __bulk?: { running: boolean } };
const transports = new Map<string, Transporter>();

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function compose(body: string, unsub: string, pixel: string | null) {
  const text = `${body}\n\n--\nIf you'd rather not get these emails, unsubscribe here: ${unsub}`;
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#111">` +
    escapeHtml(body)
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
      .join("") +
    `<p style="margin:20px 0 0;font-size:12px;color:#777"><a href="${escapeHtml(unsub)}" style="color:#777">Unsubscribe</a></p>` +
    (pixel ? `<img src="${escapeHtml(pixel)}" width="1" height="1" alt="" style="display:block;border:0">` : "") +
    `</div>`;
  return { text, html };
}

export function kickBulkSender() {
  if (!g.__bulk) g.__bulk = { running: false };
  if (g.__bulk.running) return;
  g.__bulk.running = true;
  loop()
    .catch((e) => console.error("Bulk sender:", e))
    .finally(() => {
      g.__bulk!.running = false;
    });
}

async function loop() {
  for (;;) {
    const batches = await db.emailBatch.findMany({ where: { status: "ACTIVE" } });
    if (batches.length === 0) return;
    let didWork = false;
    let waiting = false;
    const dayAgo = new Date(Date.now() - 24 * 3600_000);

    for (const b of batches) {
      const mb = await db.mailbox.findUnique({ where: { id: b.mailboxId } });
      if (!mb || !mb.active) continue;
      const next = await db.emailMessage.findFirst({ where: { batchId: b.id, status: "QUEUED" }, orderBy: { createdAt: "asc" }, include: { lead: { select: { address: true } } } });
      if (!next) {
        await db.emailBatch.update({ where: { id: b.id }, data: { status: "DONE" } });
        await notify(b.userId, `Bulk email “${b.name}” finished`, `All ${b.total} emails were processed.`, "/bulk-email");
        continue;
      }
      waiting = true;
      if (mb.lastSentAt && Date.now() - mb.lastSentAt.getTime() < mb.gapSeconds * 1000) continue;
      const sentToday = await db.emailMessage.count({ where: { mailboxId: mb.id, status: "SENT", sentAt: { gte: dayAgo } } });
      if (sentToday >= mb.dailyLimit) continue;
      // Respect the mailbox's send-hours window, in the recipient's timezone when known
      if (mb.sendFromHour !== mb.sendToHour) {
        const tz = zoneForAddress(next.lead?.address ?? null) ?? mb.sendTz ?? null;
        if (!withinWindow(mb.sendFromHour, mb.sendToHour, tz)) { waiting = true; continue; }
      }

      const claimed = await db.emailMessage.updateMany({ where: { id: next.id, status: "QUEUED" }, data: { status: "SENDING" } });
      if (claimed.count === 0) continue;
      didWork = true;

      if (await isSuppressed(mb.userId, next.toEmail)) {
        await db.emailMessage.update({ where: { id: next.id }, data: { status: "SKIPPED", error: "Unsubscribed or bounced earlier" } });
        continue;
      }
      let t = transports.get(mb.id);
      if (!t) {
        t = nodemailer.createTransport({ host: mb.host, port: mb.port, secure: mb.port === 465, auth: { user: mb.username, pass: decrypt(mb.passEnc) } });
        transports.set(mb.id, t);
      }
      const unsub = unsubscribeUrl(mb.userId, next.toEmail);
      const { text, html } = compose(next.body, unsub, mb.trackOpens ? appUrl(`/api/t/o/${next.id}`) : null);
      try {
        await t.sendMail({
          from: `${(b.fromName || mb.fromName).replace(/[<>"]/g, "")} <${mb.fromEmail}>`,
          to: next.toEmail,
          replyTo: b.replyTo || mb.replyTo || undefined,
          subject: next.subject,
          text,
          html,
          headers: { "List-Unsubscribe": `<${unsub}>` },
        });
        const now = new Date();
        await db.emailMessage.update({ where: { id: next.id }, data: { status: "SENT", sentAt: now, error: null } });
        await db.mailbox.update({ where: { id: mb.id }, data: { lastSentAt: now, lastError: null } });
      } catch (err) {
        const e = err as { responseCode?: number; code?: string; message?: string };
        const reason = (e.message ?? "Sending failed").slice(0, 300);
        await db.emailMessage.update({ where: { id: next.id }, data: { status: "FAILED", error: reason } });
        await db.mailbox.update({ where: { id: mb.id }, data: { lastSentAt: new Date() } });
        if (e.code === "EAUTH" || e.responseCode === 535) {
          transports.delete(mb.id);
          await db.mailbox.update({ where: { id: mb.id }, data: { active: false, lastError: reason } });
          await db.emailBatch.update({ where: { id: b.id }, data: { status: "PAUSED" } });
          await notify(b.userId, `Bulk email “${b.name}” paused`, "The mailbox couldn't sign in. Check its password, then resume.", "/bulk-email");
        } else if (e.responseCode && e.responseCode >= 550 && e.responseCode < 560) {
          await db.suppression.upsert({
            where: { userId_email: { userId: mb.userId, email: next.toEmail } },
            create: { userId: mb.userId, email: next.toEmail, reason: "BOUNCED" },
            update: {},
          });
          await db.mailbox.update({ where: { id: mb.id }, data: { reputation: { decrement: 2 } } }).catch(() => undefined);
          // Bounce guardian: too many bounces in a row pauses the mailbox
          const recent = await db.emailMessage.count({ where: { mailboxId: mb.id, status: { in: ["SENT", "FAILED"] }, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
          const bounced = await db.emailMessage.count({ where: { mailboxId: mb.id, status: "FAILED", createdAt: { gte: new Date(Date.now() - 3600_000) } } });
          if (recent >= 20 && bounced / recent > 0.05) {
            await db.mailbox.update({ where: { id: mb.id }, data: { active: false, lastError: "Paused: too many bounces. Clean the list before sending more." } });
            await db.emailBatch.updateMany({ where: { mailboxId: mb.id, status: "ACTIVE" }, data: { status: "PAUSED" } });
            await notify(mb.userId, "Sending paused to protect your domain", "Too many emails bounced. Check your list quality, then resume.", "/bulk-email");
          }
        }
      }
    }
    if (!waiting) return;
    await new Promise((r) => setTimeout(r, didWork ? 300 : 1500));
  }
}

export function forgetBulkTransport(mailboxId: string) {
  transports.delete(mailboxId);
}
