import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!allow(`invite:${clientIp(req)}`, 10, 10 * 60_000)) return fail("Too many attempts. Wait a few minutes.", 429);
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  const name = String(body?.name ?? "").trim();
  const password = String(body?.password ?? "");

  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite || invite.usedAt) return fail("This invite link is no longer valid. Ask for a new one.", 410);
  if (name.length < 2) return fail("Enter your name.");
  if (password.length < 8) return fail("Use at least 8 characters for your password.");
  if (await db.user.findUnique({ where: { email: invite.email } })) return fail("An account with this email already exists.", 409);

  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name,
        email: invite.email,
        passwordHash: await bcrypt.hash(password, 10),
        ownerId: invite.ownerId,
        credits: 0,
        emailVerifiedAt: new Date(), // they reached us through the invite sent to this address
        lastLoginAt: new Date(),
      },
      select: { id: true, role: true },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    return u;
  });
  await startSession(user);
  return NextResponse.json({ ok: true });
}
