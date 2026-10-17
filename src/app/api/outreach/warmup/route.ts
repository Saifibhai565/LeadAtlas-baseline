import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { checkDns } from "@/lib/deliverability";
import { warmupCap } from "@/lib/warmup";

/** POST { mailboxId, on } turns warmup on/off. POST { mailboxId, checkDns: true } saves the DNS result for that mailbox. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const mb = await db.mailbox.findFirst({ where: { id: String(b?.mailboxId ?? ""), userId: user.wsId } });
  if (!mb) return fail("Mailbox not found.", 404);

  if (b?.checkDns) {
    const domain = mb.fromEmail.split("@")[1];
    const { result } = await checkDns(domain);
    await db.mailbox.update({ where: { id: mb.id }, data: { dnsSpf: result.spf.ok, dnsDkim: result.dkim.ok, dnsDmarc: result.dmarc.ok, dnsCheckedAt: new Date() } });
    return NextResponse.json({ result });
  }
  const on = Boolean(b?.on);
  await db.mailbox.update({ where: { id: mb.id }, data: { warmup: on } });
  return NextResponse.json({ ok: true, cap: warmupCap(mb.warmupStage) });
}
