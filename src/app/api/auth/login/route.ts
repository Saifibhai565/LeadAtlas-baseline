import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!allow(`login:${clientIp(req)}`, 10, 10 * 60_000)) {
    return fail("Too many sign-in attempts. Wait 10 minutes and try again.", 429);
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) return fail("Email or password is incorrect.", 401);
  if (user.blocked) return fail("This account is switched off. Contact support if you think this is a mistake.", 403);

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  return NextResponse.json({ ok: true });
}
