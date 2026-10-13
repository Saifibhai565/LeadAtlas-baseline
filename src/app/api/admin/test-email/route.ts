import { NextResponse } from "next/server";
import { emails } from "@/lib/emails";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { sendMail, SMTP_READY } from "@/lib/mail";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  return NextResponse.json({ ready: SMTP_READY, host: process.env.SMTP_HOST || null, from: process.env.SMTP_FROM || null });
}

export async function POST() {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  if (!SMTP_READY) return fail("SMTP isn't set up. Add SMTP_HOST, SMTP_USER and SMTP_PASS to .env and restart.", 503);
  const ok = await sendMail(emails.test(admin.email));
  if (!ok) return fail("Sending failed. Check the terminal for the error, then check your SMTP settings.", 502);
  return NextResponse.json({ ok: true, to: admin.email });
}
