import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { decrypt, sign } from "./crypto";
import { db } from "./db";
import { logActivity } from "./leads";
import { appUrl } from "./mail";
import { notify } from "./notify";
import { renderTemplate } from "./template";

export type Step = { delayDays: number; subject: string; body: string };

export function parseSteps(json: string): Step[] {
  try {
    const arr = JSON.parse(json) as Step[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function unsubscribeUrl(wsId: string, email: string) {
  return appUrl(`/u/${sign({ w: wsId, e: email.toLowerCase() })}`);
}

export async function isSuppressed(wsId: string, email: string) {
  return Boolean(await db.suppression.findUnique({ where: { userId_email: { userId: wsId, email: email.toLowerCase() } } }));
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Plain, personal-looking email: no images or design, which is what lands in the inbox for cold email. */
function compose(body: string, unsub: string, pixel: string | null) {
  const text = `${body}\n\n--\nIf you'd rather not hear from me again, reply "stop" or unsubscribe here: ${unsub}`;
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#111">` +
    escapeHtml(body)
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
      .join("") +
    `<p style="margin:20px 0 0;font-size:12px;color:#777">If you'd rather not hear from me again, reply "stop" or <a href="${escapeHtml(unsub)}" style="color:#777">unsubscribe</a>.</p>` +
    (pixel ? `<img src="${escapeHtml(pixel)}" width="1" height="1" alt="" style="display:block;border:0">` : "") +
    `</div>`;
  return { text, html };
}

/** Queues one email. Returns the message, or null when the address has unsubscribed. */
export async function queueEmail(m: {
  wsId: string;
  mailboxId: string;
  leadId?: string | null;
  to: string;
  subject: string;
  body: string;
  enrollmentId?: string | null;
  step?: number | null;
}) {
  const to = m.to.trim().toLowerCase();
  if (await isSuppressed(m.wsId, to)) return null;
  return db.emailMessage.create({
    data: {
      userId: m.wsId,
      mailboxId: m.mailboxId,
      leadId: m.leadId ?? null,
      toEmail: to,
      subject: m.subject.slice(0, 250),
      body: m.body.slice(0, 20000),
      enrollmentId: m.enrollmentId ?? null,
      step: m.step ?? null,
    },
  });
}

function firstEmail(emails: string | null) {
  return (emails ?? "").split(",").map((e) => e.trim()).find((e) => e.includes("@")) ?? null;
}

/** Turns due sequence steps into queued emails, and stops sequences that should stop. */
export async function processSequences() {
  const due = await db.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextAt: { lte: new Date() } },
    include: { sequence: true, lead: true },
    take: 100,
  });
  for (const en of due) {
    const end = (status: string) =>
      db.sequenceEnrollment.update({ where: { id: en.id }, data: { status, endedAt: new Date() } });
    if (!en.sequence.active) continue;
    if (["INTERESTED", "WON", "LOST"].includes(en.lead.status)) {
      await end(en.lead.status === "INTERESTED" ? "REPLIED" : "STOPPED");
      continue;
    }
    const to = firstEmail(en.lead.emails);
    if (!to) {
      await end("STOPPED");
      continue;
    }
    if (await isSuppressed(en.userId, to)) {
      await end("UNSUBSCRIBED");
      continue;
    }
    const steps = parseSteps(en.sequence.steps);
    const step = steps[en.currentStep];
    if (!step) {
      await end("FINISHED");
      continue;
    }
    const sender = await db.user.findUnique({ where: { id: en.userId }, select: { name: true, businessName: true, signature: true } });
    const me = { name: sender?.name ?? "", businessName: sender?.businessName, signature: sender?.signature };
    const firstSubject = renderTemplate(steps[0]?.subject || "", en.lead, me);
    const subject = step.subject?.trim() ? renderTemplate(step.subject, en.lead, me) : `Re: ${firstSubject}`;
    await queueEmail({
      wsId: en.userId,
      mailboxId: en.mailboxId,
      leadId: en.leadId,
      to,
      subject,
      body: renderTemplate(step.body, en.lead, me),
      enrollmentId: en.id,
      step: en.currentStep,
    });
    const next = steps[en.currentStep + 1];
    await db.sequenceEnrollment.update({
      where: { id: en.id },
      data: next
        ? { currentStep: en.currentStep + 1, nextAt: new Date(Date.now() + Math.max(1, next.delayDays) * 86400_000) }
        : { currentStep: en.currentStep + 1, status: "FINISHED", endedAt: new Date() },
    });
  }
}

const transports = new Map<string, Transporter>();

/** Sends at most one queued email per mailbox, respecting each mailbox's daily limit and gap. */
export async function processOutbox() {
  // An email left half-sent by a restart is marked failed rather than risk sending it twice
  await db.emailMessage.updateMany({
    where: { status: "SENDING", scheduledAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: "FAILED", error: "Interrupted while sending. Check it and send again if needed." },
  });
  const mailboxes = await db.mailbox.findMany({ where: { active: true } });
  const dayAgo = new Date(Date.now() - 24 * 3600_000);

  for (const mb of mailboxes) {
    if (mb.lastSentAt && Date.now() - mb.lastSentAt.getTime() < mb.gapSeconds * 1000) continue;
    const sentToday = await db.emailMessage.count({ where: { mailboxId: mb.id, status: "SENT", sentAt: { gte: dayAgo } } });
    if (sentToday >= mb.dailyLimit) continue;

    const msg = await db.emailMessage.findFirst({
      where: { mailboxId: mb.id, status: "QUEUED", scheduledAt: { lte: new Date() }, batchId: null },
      orderBy: { scheduledAt: "asc" },
    });
    if (!msg) continue;

    // Claim it so a second tick can't send it twice
    const claimed = await db.emailMessage.updateMany({ where: { id: msg.id, status: "QUEUED" }, data: { status: "SENDING" } });
    if (claimed.count === 0) continue;

    if (await isSuppressed(mb.userId, msg.toEmail)) {
      await db.emailMessage.update({ where: { id: msg.id }, data: { status: "SKIPPED", error: "Unsubscribed" } });
      continue;
    }

    let transport = transports.get(mb.id);
    if (!transport) {
      transport = nodemailer.createTransport({
        host: mb.host,
        port: mb.port,
        secure: mb.port === 465,
        auth: { user: mb.username, pass: decrypt(mb.passEnc) },
      });
      transports.set(mb.id, transport);
    }

    const pixel = mb.trackOpens ? appUrl(`/api/t/o/${msg.id}`) : null;
    const { text, html } = compose(msg.body, unsubscribeUrl(mb.userId, msg.toEmail), pixel);
    try {
      await transport.sendMail({
        from: `${mb.fromName} <${mb.fromEmail}>`,
        to: msg.toEmail,
        replyTo: mb.replyTo || undefined,
        subject: msg.subject,
        text,
        html,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl(mb.userId, msg.toEmail)}>` },
      });
      const now = new Date();
      await db.emailMessage.update({ where: { id: msg.id }, data: { status: "SENT", sentAt: now, error: null } });
      await db.mailbox.update({ where: { id: mb.id }, data: { lastSentAt: now, lastError: null } });
      if (msg.leadId) {
        const lead = await db.lead.findUnique({ where: { id: msg.leadId }, select: { status: true } });
        if (lead) {
          await db.lead.update({
            where: { id: msg.leadId },
            data: { lastContactAt: now, ...(lead.status === "NEW" ? { status: "CONTACTED" } : {}) },
          });
          await logActivity(mb.userId, msg.leadId, "MESSAGE", `Email${msg.step != null ? ` (step ${msg.step + 1})` : ""}: ${msg.subject}\n\n${msg.body}`);
        }
      }
    } catch (err) {
      const e = err as { responseCode?: number; code?: string; message?: string };
      const reason = (e.message ?? "Sending failed").slice(0, 300);
      await db.emailMessage.update({ where: { id: msg.id }, data: { status: "FAILED", error: reason } });
      await db.mailbox.update({ where: { id: mb.id }, data: { lastSentAt: new Date() } });

      if (e.code === "EAUTH" || e.responseCode === 535) {
        // Wrong password or blocked login: pause the mailbox so the queue doesn't burn through
        transports.delete(mb.id);
        await db.mailbox.update({ where: { id: mb.id }, data: { active: false, lastError: reason } });
        await notify(mb.userId, `Mailbox “${mb.label}” was paused`, "It couldn't sign in. Check the password in Outreach > Mailboxes.", "/outreach");
      } else if (e.responseCode && e.responseCode >= 550 && e.responseCode < 560) {
        // The address doesn't exist: never send to it again
        await db.suppression.upsert({
          where: { userId_email: { userId: mb.userId, email: msg.toEmail } },
          create: { userId: mb.userId, email: msg.toEmail, reason: "BOUNCED" },
          update: {},
        });
        if (msg.enrollmentId) {
          await db.sequenceEnrollment.update({ where: { id: msg.enrollmentId }, data: { status: "BOUNCED", endedAt: new Date() } }).catch(() => undefined);
        }
      }
    }
  }
}

export function forgetTransport(mailboxId: string) {
  transports.delete(mailboxId);
}
