import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { outreachBlocked } from "@/lib/outreach-route";
import { assertPublicHost } from "@/lib/web";

export const dynamic = "force-dynamic";

const PUBLIC = {
  id: true,
  label: true,
  fromName: true,
  fromEmail: true,
  host: true,
  port: true,
  username: true,
  dailyLimit: true,
  gapSeconds: true,
  trackOpens: true,
  active: true,
  lastError: true,
  lastSentAt: true,
  createdAt: true,
} as const;

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const boxes = await db.mailbox.findMany({ where: { userId: user.wsId }, select: PUBLIC, orderBy: { createdAt: "asc" } });
  const withCounts = await Promise.all(
    boxes.map(async (b) => ({
      ...b,
      sentToday: await db.emailMessage.count({ where: { mailboxId: b.id, status: "SENT", sentAt: { gte: dayAgo } } }),
      queued: await db.emailMessage.count({ where: { mailboxId: b.id, status: "QUEUED" } }),
    })),
  );
  return NextResponse.json({ mailboxes: withCounts, allowed: user.canUseOutreach, isOwner: user.isOwner });
}

/** Connects a mailbox. Checks that it can actually sign in before saving. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;
  if (!user.isOwner) return fail("Only the account owner can connect mailboxes.", 403);

  const b = await req.json().catch(() => ({}));
  const fromEmail = String(b?.fromEmail ?? "").trim().toLowerCase();
  const host = String(b?.host ?? "").trim().toLowerCase();
  const port = Math.round(Number(b?.port ?? 587));
  const username = String(b?.username ?? "").trim() || fromEmail;
  const password = String(b?.password ?? "");
  const fromName = String(b?.fromName ?? "").trim().slice(0, 80) || user.name;
  const label = String(b?.label ?? "").trim().slice(0, 60) || fromEmail;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) return fail("Enter the email address you send from.");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return fail("Enter the SMTP server, like smtp.gmail.com.");
  if (![25, 465, 587, 2525].includes(port)) return fail("Use port 587, 465, 2525 or 25.");
  if (!password) return fail("Enter the mailbox password or app password.");
  if ((await db.mailbox.count({ where: { userId: user.wsId } })) >= 10) return fail("You can connect up to 10 mailboxes.");

  try {
    await assertPublicHost(host);
    const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: username, pass: password }, connectionTimeout: 15000 });
    await t.verify();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't connect.";
    return fail(`Couldn't sign in to that mailbox: ${msg.slice(0, 200)}. For Gmail, use an App Password, not your normal password.`, 400);
  }

  const mailbox = await db.mailbox.create({
    data: {
      userId: user.wsId,
      label,
      fromName,
      fromEmail,
      host,
      port,
      username,
      passEnc: encrypt(password),
      dailyLimit: Math.min(200, Math.max(5, Math.round(Number(b?.dailyLimit ?? 40)))),
    },
    select: PUBLIC,
  });
  return NextResponse.json({ mailbox }, { status: 201 });
}
