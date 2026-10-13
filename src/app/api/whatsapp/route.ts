import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { appUrl } from "@/lib/mail";
import { outreachBlocked } from "@/lib/outreach-route";
import { waPhoneInfo } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const acc = await db.waAccount.findUnique({ where: { userId: user.wsId } });
  return NextResponse.json({
    connected: Boolean(acc),
    allowed: user.canUseOutreach,
    isOwner: user.isOwner,
    account: acc ? { displayNumber: acc.displayNumber, verifiedName: acc.verifiedName, phoneNumberId: acc.phoneNumberId, wabaId: acc.wabaId } : null,
    webhook: acc ? { url: appUrl(`/api/webhooks/whatsapp/${acc.id}`), verifyToken: acc.verifyToken } : null,
  });
}

/** POST { phoneNumberId, wabaId, accessToken, appSecret? } — checks the number with Meta, then saves it. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;
  if (!user.isOwner) return fail("Only the account owner can connect WhatsApp.", 403);
  const b = await req.json().catch(() => ({}));
  const phoneNumberId = String(b?.phoneNumberId ?? "").trim();
  const wabaId = String(b?.wabaId ?? "").trim();
  const accessToken = String(b?.accessToken ?? "").trim();
  const appSecret = String(b?.appSecret ?? "").trim();
  if (!/^\d{6,}$/.test(phoneNumberId)) return fail("Enter the Phone number ID from Meta (digits only).");
  if (!/^\d{6,}$/.test(wabaId)) return fail("Enter the WhatsApp Business Account ID (digits only).");
  if (accessToken.length < 20) return fail("Enter the access token.");

  let info;
  try {
    info = await waPhoneInfo(phoneNumberId, accessToken);
  } catch (err) {
    return fail(`Meta didn't accept these details: ${err instanceof Error ? err.message : "error"}`);
  }
  const data = {
    phoneNumberId,
    wabaId,
    displayNumber: info.display_phone_number ?? null,
    verifiedName: info.verified_name ?? null,
    accessTokenEnc: encrypt(accessToken),
    appSecretEnc: appSecret ? encrypt(appSecret) : null,
  };
  const acc = await db.waAccount.upsert({
    where: { userId: user.wsId },
    create: { userId: user.wsId, verifyToken: randomBytes(16).toString("hex"), ...data },
    update: data,
  });
  return NextResponse.json({ ok: true, webhook: { url: appUrl(`/api/webhooks/whatsapp/${acc.id}`), verifyToken: acc.verifyToken } });
}

export async function DELETE() {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can disconnect WhatsApp.", 403);
  await db.waAccount.deleteMany({ where: { userId: user.wsId } });
  return NextResponse.json({ ok: true });
}
