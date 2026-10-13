import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";
import { consumeEmailToken } from "@/lib/tokens";

export async function POST(req: Request) {
  if (!allow(`reset:${clientIp(req)}`, 10, 60 * 60_000)) return fail("Too many attempts. Try again later.", 429);
  const b = await req.json().catch(() => ({}));
  const password = String(b?.password ?? "");
  if (password.length < 8) return fail("Use at least 8 characters for your new password.");
  const userId = await consumeEmailToken(String(b?.token ?? ""), "RESET");
  if (!userId) return fail("This reset link has expired or was already used. Ask for a new one.", 410);
  const user = await db.user.update({
    where: { id: userId },
    // Opening the link proves they own the email
    data: { passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: new Date(), lastLoginAt: new Date() },
    select: { id: true, role: true, blocked: true },
  });
  if (user.blocked) return fail("This account is switched off. Contact support.", 403);
  await startSession(user);
  return NextResponse.json({ ok: true });
}
