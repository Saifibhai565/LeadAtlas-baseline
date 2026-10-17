import { NextResponse } from "next/server";
import { checkBlacklist, checkDns, scanContent } from "@/lib/deliverability";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { allow } from "@/lib/ratelimit";

export const maxDuration = 60;

/**
 * POST { action }
 *  "dns"   { domain }           -> SPF / DKIM / DMARC
 *  "blacklist" { ip }           -> RBL check
 *  "scan"  { subject, body }    -> spam-word and content score
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));

  if (b?.action === "scan") {
    return NextResponse.json(scanContent(String(b?.subject ?? ""), String(b?.body ?? "")));
  }
  if (!allow(`deliv:${user.wsId}`, 40, 3600_000)) return fail("Too many checks this hour. Try again later.", 429);

  if (b?.action === "dns") {
    const domain = String(b?.domain ?? "").trim();
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)) return fail("Enter a domain like mail.yourbusiness.com.");
    const out = await checkDns(domain);
    await db.deliverabilityCheck.create({ data: { userId: user.wsId, kind: "DNS", result: JSON.stringify(out.result), score: out.score } });
    return NextResponse.json(out);
  }
  if (b?.action === "blacklist") {
    const ip = String(b?.ip ?? "").trim();
    const out = await checkBlacklist(ip);
    await db.deliverabilityCheck.create({ data: { userId: user.wsId, kind: "BLACKLIST", result: JSON.stringify(out) } });
    return NextResponse.json(out);
  }
  return fail("Unknown check.");
}

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const mailboxes = await db.mailbox.findMany({
    where: { userId: user.wsId },
    select: { id: true, label: true, fromEmail: true, active: true, warmup: true, warmupStage: true, reputation: true, dnsSpf: true, dnsDkim: true, dnsDmarc: true, dnsCheckedAt: true },
  });
  return NextResponse.json({ mailboxes });
}
