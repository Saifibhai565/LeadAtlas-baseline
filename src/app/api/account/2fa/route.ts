import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { currentUser } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { fail, unauthorized } from "@/lib/http";
import { backupCodes, generateSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { APP_NAME } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.id }, select: { totpEnabled: true } });
  return NextResponse.json({ enabled: Boolean(u?.totpEnabled) });
}

/**
 * POST { action:"setup" } -> returns a new secret + QR text (not yet enabled)
 * POST { action:"enable", secret, code } -> verifies and turns it on, returns backup codes
 * POST { action:"disable", code } -> turns it off
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));

  if (b?.action === "setup") {
    const secret = generateSecret();
    return NextResponse.json({ secret, otpauth: otpauthUrl(secret, user.email, APP_NAME) });
  }
  if (b?.action === "enable") {
    const secret = String(b?.secret ?? "");
    if (!verifyTotp(secret, String(b?.code ?? ""))) return fail("That code didn't match. Try the current one from your app.");
    const codes = backupCodes();
    const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c, 8)));
    await db.user.update({ where: { id: user.id }, data: { totpSecret: encrypt(secret), totpEnabled: true, totpBackup: JSON.stringify(hashed) } });
    return NextResponse.json({ ok: true, backupCodes: codes });
  }
  if (b?.action === "disable") {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { totpSecret: true } });
    if (!u?.totpSecret || !verifyTotp(decrypt(u.totpSecret), String(b?.code ?? ""))) return fail("Enter a current code to turn off two-factor.");
    await db.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabled: false, totpBackup: null } });
    return NextResponse.json({ ok: true });
  }
  return fail("Unknown action.");
}
