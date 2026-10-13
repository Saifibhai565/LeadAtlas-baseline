import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** Sends a test email from this mailbox to the person clicking. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const mb = await db.mailbox.findFirst({ where: { id, userId: user.wsId } });
  if (!mb) return fail("Mailbox not found.", 404);
  try {
    const t = nodemailer.createTransport({ host: mb.host, port: mb.port, secure: mb.port === 465, auth: { user: mb.username, pass: decrypt(mb.passEnc) } });
    await t.sendMail({
      from: `${mb.fromName} <${mb.fromEmail}>`,
      to: user.email,
      subject: "Test from your connected mailbox",
      text: `This mailbox (${mb.fromEmail}) is connected and can send emails.`,
    });
    return NextResponse.json({ ok: true, to: user.email });
  } catch (err) {
    return fail(`Sending failed: ${(err instanceof Error ? err.message : "unknown error").slice(0, 200)}`, 502);
  }
}
