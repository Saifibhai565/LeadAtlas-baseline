import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";
import { getSetting } from "@/lib/settings";
import { currentBrand } from "@/lib/brand";
import { emails } from "@/lib/emails";
import { appUrl, sendMailLater } from "@/lib/mail";
import { createEmailToken } from "@/lib/tokens";

export async function POST(req: Request) {
  if (!allow(`register:${clientIp(req)}`, 5, 60 * 60_000)) {
    return fail("Too many accounts created from this connection. Try again later.", 429);
  }
  if ((await currentBrand()).custom) return fail("Sign-ups on this address are by invite only.", 403);
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (name.length < 2) return fail("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("Use at least 8 characters for your password.");

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return fail("An account with this email already exists. Sign in instead.", 409);

  // The admin is ADMIN_EMAIL if set; otherwise the very first account (you, the owner).
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isFirst = adminEmail ? email === adminEmail : (await db.user.count()) === 0;
  const credits = Number(await getSetting("signup_credits"));

  const refCode = (await cookies()).get("ref")?.value;
  const referrer = refCode ? await db.user.findUnique({ where: { referralCode: refCode }, select: { id: true } }) : null;

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: isFirst ? "ADMIN" : "USER",
      referredById: referrer?.id ?? null,
      credits: isFirst ? 1_000_000 : Number.isFinite(credits) ? credits : 500,
    },
    select: { id: true, role: true },
  });

  await startSession(user);
  const token = await createEmailToken(user.id, "VERIFY", 3 * 86400_000);
  sendMailLater(emails.welcomeVerify(email, name, appUrl(`/verify?token=${token}`)));
  return NextResponse.json({ ok: true });
}
