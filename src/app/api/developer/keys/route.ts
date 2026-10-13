import { NextResponse } from "next/server";
import { newKey } from "@/lib/apikey";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const keys = await db.apiKey.findMany({
    where: { userId: user.wsId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json({ keys, allowed: user.canUseAPI, isOwner: user.isOwner });
}

/** Creates a key. The full key is returned once and never stored. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can create API keys.", 403);
  if (!user.canUseAPI) return fail("API access is part of the Agency plan. Upgrade on the Billing page.", 402);
  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim().slice(0, 60) || "API key";
  if ((await db.apiKey.count({ where: { userId: user.wsId } })) >= 20) return fail("You can keep up to 20 keys.");
  const { key, prefix, keyHash } = newKey();
  const row = await db.apiKey.create({ data: { userId: user.wsId, name, prefix, keyHash } });
  return NextResponse.json({ key, id: row.id }, { status: 201 });
}
