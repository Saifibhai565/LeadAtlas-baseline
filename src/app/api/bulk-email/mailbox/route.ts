import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { outreachBlocked } from "@/lib/outreach-route";
import { allowedFrom, getPlatformSmtp } from "@/lib/platform-sender";

/**
 * POST { fromName, fromEmail?, replyTo } — a mailbox that sends through the platform's shared server.
 * The customer only gives a name and where replies should go.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;
  const p = await getPlatformSmtp();
  if (!p?.enabled || !p.passEnc) return fail("The shared sending server isn't set up yet.", 503);
  const b = await req.json().catch(() => ({}));
  const fromName = String(b?.fromName ?? "").trim().slice(0, 80);
  const replyTo = String(b?.replyTo ?? "").trim().toLowerCase();
  let fromEmail = String(b?.fromEmail ?? "").trim().toLowerCase() || p.defaultFrom;
  if (!fromName) return fail("Enter the name people will see.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return fail("Enter your email for replies.");
  if (!allowedFrom(p, fromEmail)) return fail(`The sending address must end with @${p.domains.join(" or @")}.`);
  if ((await db.mailbox.count({ where: { userId: user.wsId, platform: true } })) >= 10) return fail("You can have up to 10 sender names.");
  const mb = await db.mailbox.create({
    data: {
      userId: user.wsId,
      label: `${fromName} (via our server)`,
      fromName,
      fromEmail,
      replyTo,
      platform: true,
      host: p.host,
      port: p.port,
      username: p.user,
      passEnc: p.passEnc,
      dailyLimit: p.dailyLimit,
      gapSeconds: p.gapSeconds,
    },
  });
  fromEmail = mb.fromEmail;
  return NextResponse.json({ id: mb.id, fromEmail }, { status: 201 });
}
