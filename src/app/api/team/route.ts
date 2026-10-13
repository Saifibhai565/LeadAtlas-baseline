import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/emails";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { appUrl, sendMail, SMTP_READY } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const [owner, members, invites] = await Promise.all([
    db.user.findUnique({ where: { id: user.wsId }, select: { id: true, name: true, email: true } }),
    db.user.findMany({
      where: { ownerId: user.wsId, blocked: false },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    user.isOwner
      ? db.invite.findMany({ where: { ownerId: user.wsId, usedAt: null }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);
  return NextResponse.json({
    owner,
    members,
    invites: invites.map((i) => ({ id: i.id, email: i.email, token: i.token, createdAt: i.createdAt })),
    seats: user.seats,
    isOwner: user.isOwner,
  });
}

/** Owner invites someone: POST { email } -> returns a link to share. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can invite people.", 403);

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (await db.user.findUnique({ where: { email } })) return fail("Someone already has an account with this email.");

  const [members, pending] = await Promise.all([
    db.user.count({ where: { ownerId: user.wsId, blocked: false } }),
    db.invite.count({ where: { ownerId: user.wsId, usedAt: null } }),
  ]);
  if (1 + members + pending >= user.seats + (user.isAdmin ? 1000 : 0)) {
    return fail(`Your plan includes ${user.seats} ${user.seats === 1 ? "seat" : "seats"}. Upgrade on the Billing page to add more people.`, 402);
  }

  const invite = await db.invite.create({
    data: { ownerId: user.wsId, email, token: randomBytes(24).toString("base64url") },
  });
  const emailed = SMTP_READY ? await sendMail(emails.invite(email, user.name, appUrl(`/invite/${invite.token}`))) : false;
  return NextResponse.json({ invite: { id: invite.id, email: invite.email, token: invite.token }, emailed }, { status: 201 });
}
