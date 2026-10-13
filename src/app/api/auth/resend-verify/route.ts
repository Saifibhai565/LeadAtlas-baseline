import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/emails";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { appUrl, sendMail, SMTP_READY } from "@/lib/mail";
import { allow } from "@/lib/ratelimit";
import { createEmailToken } from "@/lib/tokens";

export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!SMTP_READY) return fail("Email isn't set up on this server yet.", 503);
  if (!allow(`verify:${user.id}`, 3, 60 * 60_000)) return fail("We've sent a few already. Check your spam folder, or try again in an hour.", 429);
  const me = await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
  if (me?.emailVerifiedAt) return NextResponse.json({ ok: true, already: true });
  const token = await createEmailToken(user.id, "VERIFY", 3 * 86400_000);
  const sent = await sendMail(emails.verify(user.email, appUrl(`/verify?token=${token}`)));
  if (!sent) return fail("The email couldn't be sent. Try again later.", 502);
  return NextResponse.json({ ok: true });
}
