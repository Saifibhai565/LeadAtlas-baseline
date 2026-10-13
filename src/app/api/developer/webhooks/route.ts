import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { normalizeUrl } from "@/lib/web";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const hooks = await db.webhook.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ hooks });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can add webhooks.", 403);
  if (!user.canUseAPI) return fail("Webhooks are part of the Agency plan. Upgrade on the Billing page.", 402);
  const b = await req.json().catch(() => ({}));
  const url = normalizeUrl(String(b?.url ?? ""));
  if (!url || url.protocol !== "https:") return fail("Use a public https:// address.");
  const events = (Array.isArray(b?.events) ? b.events : []).filter((e: string) =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e),
  );
  if (events.length === 0) return fail("Pick at least one event.");
  if ((await db.webhook.count({ where: { userId: user.wsId } })) >= 10) return fail("You can keep up to 10 webhooks.");
  const hook = await db.webhook.create({
    data: { userId: user.wsId, url: url.toString(), events: events.join(","), secret: randomBytes(24).toString("hex") },
  });
  return NextResponse.json({ hook }, { status: 201 });
}
