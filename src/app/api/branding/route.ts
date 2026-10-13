import { promises as dns } from "node:dns";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

async function addresses(host: string) {
  try {
    return (await dns.lookup(host, { all: true })).map((a) => a.address).sort();
  } catch {
    return [];
  }
}

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await db.user.findUnique({
    where: { id: user.wsId },
    select: { brandName: true, brandColor: true, brandWhatsapp: true, businessName: true, customDomain: true },
  });
  const target = process.env.WHITELABEL_TARGET || null;
  let dnsOk: boolean | null = null;
  if (b?.customDomain && target) {
    const [mine, theirs] = await Promise.all([addresses(b.customDomain), addresses(target)]);
    dnsOk = mine.length > 0 && mine.some((ip) => theirs.includes(ip));
  }
  return NextResponse.json({ branding: b, isOwner: user.isOwner, canWhiteLabel: user.canWhiteLabel, target, dnsOk });
}

export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can change branding.", 403);
  const b = await req.json().catch(() => ({}));
  const color = String(b?.brandColor ?? "").trim();
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) return fail("Use a color like #2563EB.");

  const data: Record<string, unknown> = {
    brandName: String(b?.brandName ?? "").trim().slice(0, 80) || null,
    brandColor: color || null,
    brandWhatsapp: String(b?.brandWhatsapp ?? "").replace(/[^\d+]/g, "").slice(0, 20) || null,
  };

  if (b?.customDomain !== undefined) {
    const domain = String(b.customDomain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (domain) {
      if (!user.canWhiteLabel) return fail("Your own domain is part of the Agency plan.", 402);
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) return fail("Enter a domain like leads.youragency.com.");
      let main = "";
      try {
        main = new URL(process.env.APP_URL || "http://localhost").hostname;
      } catch {
        main = "";
      }
      if (domain === main || domain.endsWith(`.${main}`)) return fail("Use your own domain, not this app's address.");
      const taken = await db.user.findUnique({ where: { customDomain: domain }, select: { id: true } });
      if (taken && taken.id !== user.wsId) return fail("Another account already uses that domain.");
      data.customDomain = domain;
    } else {
      data.customDomain = null;
    }
  }
  await db.user.update({ where: { id: user.wsId }, data });
  return NextResponse.json({ ok: true });
}
