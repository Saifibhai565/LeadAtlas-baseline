import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { sendSms } from "@/lib/sms";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.wsId }, select: { smsUrl: true, smsMethod: true, smsBody: true } });
  return NextResponse.json({ ...u, isOwner: user.isOwner });
}

/** PATCH { smsUrl, smsMethod, smsBody } ; POST { to } sends a test message. */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can set up SMS.", 403);
  const b = await req.json().catch(() => ({}));
  const smsUrl = String(b?.smsUrl ?? "").trim();
  if (smsUrl && !/^https?:\/\//i.test(smsUrl)) return fail("The address must start with http:// or https://");
  if (smsUrl && !smsUrl.includes("{to}") && !String(b?.smsBody ?? "").includes("{to}")) return fail("Put {to} where the phone number goes.");
  if (smsUrl && !smsUrl.includes("{message}") && !String(b?.smsBody ?? "").includes("{message}")) return fail("Put {message} where the text goes.");
  await db.user.update({
    where: { id: user.wsId },
    data: {
      smsUrl: smsUrl || null,
      smsMethod: b?.smsMethod === "POST" ? "POST" : "GET",
      smsBody: String(b?.smsBody ?? "").trim() || null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const to = String(b?.to ?? "").trim();
  if (!to) return fail("Enter your own number to test.");
  const cfg = await db.user.findUnique({ where: { id: user.wsId }, select: { smsUrl: true, smsMethod: true, smsBody: true } });
  try {
    const reply = await sendSms(cfg ?? { smsUrl: null, smsMethod: null, smsBody: null }, to, "Test message from your lead tool.");
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Sending failed.", 502);
  }
}
