import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();

  const b = await req.json().catch(() => ({}));
  const leadId = String(b?.leadId ?? "");
  const toNumber = String(b?.toNumber ?? "").trim();
  const body = String(b?.body ?? "").trim();

  if (!toNumber || !body) {
    return fail("Phone number and message body are required.", 400);
  }

  // Workspace owner ki SMS gateway settings check karein
  const owner = await db.user.findUnique({
    where: { id: user.wsId },
    select: { smsUrl: true, smsMethod: true, smsBody: true }
  });

  if (!owner?.smsUrl) {
    return fail("SMS gateway is not configured in Settings. Please set up your SMS API provider.", 400);
  }

  try {
    // Database mein queue/record save karein
    const smsMessage = await db.smsMessage.create({
      data: {
        userId: user.wsId,
        leadId: leadId || null,
        toNumber,
        body,
        status: "QUEUED"
      }
    });

    // Global SMS Gateway (Twilio, Nexmo, ya custom HTTP API) par request bhejne ki logic
    // URL mein {to} aur {message} placeholders replace kiye jate hain
    let targetUrl = owner.smsUrl
      .replace("{to}", encodeURIComponent(toNumber))
      .replace("{message}", encodeURIComponent(body));

    const method = owner.smsMethod || "GET";
    let response;

    if (method === "POST") {
      response = await fetch(owner.smsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: toNumber, message: body })
      });
    } else {
      response = await fetch(targetUrl, { method: "GET" });
    }

    if (response.ok) {
      await db.smsMessage.update({
        where: { id: smsMessage.id },
        data: { status: "SENT", sentAt: new Date() }
      });
      return NextResponse.json({ ok: true, id: smsMessage.id, status: "SENT" });
    } else {
      const errText = await response.text();
      await db.smsMessage.update({
        where: { id: smsMessage.id },
        data: { status: "FAILED", error: errText }
      });
      return fail(`SMS Gateway error: ${errText}`, 502);
    }
  } catch (error: any) {
    return fail(error.message || "Failed to send SMS", 500);
  }
}