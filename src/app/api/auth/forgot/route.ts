import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/emails";
import { fail } from "@/lib/http";
import { appUrl, sendMail, SMTP_READY } from "@/lib/mail";
import { allow, clientIp } from "@/lib/ratelimit";
import { createEmailToken } from "@/lib/tokens";

/** POST { email } — always answers the same way, so nobody can test which emails have accounts. */
export async function POST(req: Request) {
  if (!SMTP_READY) return fail("Email isn't set up on this server yet. Contact support.", 503);
  if (!allow(`forgot:${clientIp(req)}`, 5, 60 * 60_000)) return fail("Too many requests. Try again in an hour.", 429);
  const b = await req.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  const user = email ? await db.user.findUnique({ where: { email }, select: { id: true, blocked: true } }) : null;
  if (user && !user.blocked && allow(`forgot-user:${user.id}`, 3, 60 * 60_000)) {
    const token = await createEmailToken(user.id, "RESET", 3600_000);
    await sendMail(emails.reset(email, appUrl(`/reset?token=${token}`)));
  }
  return NextResponse.json({ ok: true });
}
