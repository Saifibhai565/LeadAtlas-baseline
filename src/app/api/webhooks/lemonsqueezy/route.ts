import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { approvePayment } from "@/lib/billing";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy calls this after a card payment. Set the webhook URL to
 *   https://your-domain/api/webhooks/lemonsqueezy
 * with the events order_created and subscription_payment_success, and the same signing secret as LEMONSQUEEZY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("x-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Bad signature." }, { status: 401 });

  const event = JSON.parse(raw) as {
    meta?: { event_name?: string; custom_data?: { ws_id?: string; plan_id?: string } };
    data?: { id?: string; attributes?: Record<string, unknown> };
  };
  const name = event.meta?.event_name;
  if (name !== "order_created" && name !== "subscription_payment_success") return NextResponse.json({ ok: true, ignored: name });

  const attrs = event.data?.attributes ?? {};
  if (name === "order_created" && attrs.status !== "paid") return NextResponse.json({ ok: true, ignored: "not paid" });
  const wsId = event.meta?.custom_data?.ws_id;
  const planId = event.meta?.custom_data?.plan_id;
  const providerRef = `${name}:${event.data?.id}`;
  if (!wsId || !planId || !event.data?.id) return NextResponse.json({ error: "Missing data." }, { status: 400 });

  // Lemon Squeezy retries; handle each payment once
  if (await db.payment.findUnique({ where: { providerRef } })) return NextResponse.json({ ok: true, duplicate: true });

  const [owner, plan] = await Promise.all([db.user.findUnique({ where: { id: wsId } }), db.plan.findUnique({ where: { id: planId } })]);
  if (!owner || !plan) return NextResponse.json({ error: "Unknown account or plan." }, { status: 404 });

  const total = Number(attrs.total ?? attrs.subtotal ?? 0) / 100;
  const payment = await db.payment.create({
    data: {
      userId: wsId,
      planId,
      amount: Math.round(total) || plan.price,
      currency: String(attrs.currency ?? plan.currency).toUpperCase(),
      method: "CARD",
      reference: String(attrs.order_number ?? attrs.identifier ?? event.data.id),
      payerName: typeof attrs.user_name === "string" ? attrs.user_name : null,
      providerRef,
    },
  });
  await approvePayment(payment.id, "Paid by card");
  return NextResponse.json({ ok: true });
}
