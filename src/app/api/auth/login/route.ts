import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { startSession } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";
import { ipAllowed } from "@/lib/access";
import { verifyTotp } from "@/lib/totp";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allow(`login:${ip}`, 10, 10 * 60_000)) return fail("Too many sign-in attempts. Wait 10 minutes and try again.", 429);
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const code = String(body?.code ?? "").trim();

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) return fail("Email or password is incorrect.", 401);
  if (user.blocked) return fail("This account is switched off. Contact support if you think this is a mistake.", 403);

  // IP allow-list of this person's workspace (owner sets it)
  const owner = user.ownerId ? await db.user.findUnique({ where: { id: user.ownerId }, select: { ipAllow: true } }) : user;
  if (!ipAllowed(ip, owner?.ipAllow ?? null)) return fail("Sign-in from this network isn't allowed for this account.", 403);

  // Two-factor, if the user turned it on
  if (user.totpEnabled && user.totpSecret) {
    if (!code) return NextResponse.json({ need2fa: true });
    let ok = user.totpSecret ? verifyTotp(decrypt(user.totpSecret), code) : false;
    if (!ok && user.totpBackup) {
      const codes = JSON.parse(user.totpBackup) as string[];
      const idx = (await Promise.all(codes.map((h) => bcrypt.compare(code.toLowerCase(), h)))).findIndex(Boolean);
      if (idx >= 0) {
        ok = true;
        codes.splice(idx, 1);
        await db.user.update({ where: { id: user.id }, data: { totpBackup: JSON.stringify(codes) } });
      }
    }
    if (!ok) return fail("That code is incorrect. Check your authenticator app.", 401);
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  return NextResponse.json({ ok: true });
}
