import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { CARD_ENABLED } from "@/lib/billing";
import { checkCoupon } from "@/lib/coupons";
import { amountFor } from "@/lib/method-input";
import { emails } from "@/lib/emails";
import { adminAlertEmail, sendMailLater } from "@/lib/mail";
import { ensurePlans, getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const [plans, payments, instructions] = await Promise.all([
    ensurePlans(),
    db.payment.findMany({
      where: { userId: user.wsId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { plan: { select: { name: true } } },
    }),
    getSetting("payment_instructions"),
  ]);
  return NextResponse.json({
    current: { planName: user.planName, expiresAt: user.planExpiresAt, credits: user.credits, seats: user.seats },
    plans: plans.map(({ lsVariantId, ...p }) => ({ ...p, card: CARD_ENABLED && Boolean(lsVariantId) })),
    methods: await db.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, kind: true, currency: true, network: true, accountTitle: true, accountNumber: true, details: true, qrImage: true },
    }),
    payments,
    instructions,
    isOwner: user.isOwner,
  });
}

const METHODS = ["JAZZCASH", "EASYPAISA", "BANK", "OTHER"];

/** Owner reports a payment: POST { planId, method, reference, payerName?, payerPhone? } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can pay for the plan.", 403);

  const b = await req.json().catch(() => ({}));
  const plan = await db.plan.findFirst({ where: { id: String(b?.planId ?? ""), active: true } });
  if (!plan) return fail("Choose a plan.");
  // Payment methods set up by the Super Admin (bank, wallets, dollars, crypto); the old fixed list is the fallback
  const pm = b?.methodId ? await db.paymentMethod.findFirst({ where: { id: String(b.methodId), active: true } }) : null;
  const method = pm ? pm.name.slice(0, 40) : String(b?.method ?? "");
  if (!pm && !METHODS.includes(method)) return fail("Choose how you paid.");
  const currency = pm?.currency ?? plan.currency;
  const base = pm ? amountFor(plan, pm.currency) : plan.price;
  if (base == null) return fail(`This plan has no ${pm?.currency} price yet. Choose another method.`);
  const reference = String(b?.reference ?? "").trim().slice(0, 100);
  if (reference.length < 4) return fail("Enter the transaction ID from your payment receipt.");

  let couponCode: string | null = null;
  let discount = 0;
  if (String(b?.couponCode ?? "").trim()) {
    const c = await checkCoupon(String(b.couponCode), { ...plan, price: base });
    if (!c.ok) return fail(c.error);
    couponCode = c.code;
    discount = c.discount;
  }

  const pending = await db.payment.count({ where: { userId: user.wsId, status: "PENDING" } });
  if (pending >= 3) return fail("You already have payments waiting for review. We'll confirm them soon.");
  if (await db.payment.findFirst({ where: { reference, method } })) return fail("This transaction ID was already submitted.");

  const payment = await db.payment.create({
    data: {
      userId: user.wsId,
      planId: plan.id,
      amount: base - discount,
      currency,
      methodId: pm?.id ?? null,
      couponCode,
      discount,
      method,
      reference,
      payerName: String(b?.payerName ?? "").trim().slice(0, 80) || null,
      payerPhone: String(b?.payerPhone ?? "").trim().slice(0, 30) || null,
    },
  });
  const amount = `${currency} ${(base - discount).toLocaleString("en-US")}`;
  sendMailLater(emails.paymentReceived(user.email, plan.name, amount, reference));
  const alertTo = adminAlertEmail();
  if (alertTo) sendMailLater(emails.adminNewPayment(alertTo, `${user.name} (${user.email})`, plan.name, amount, method.toLowerCase(), reference));
  return NextResponse.json({ payment }, { status: 201 });
}
