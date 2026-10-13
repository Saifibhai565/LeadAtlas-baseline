import "server-only";
import { db } from "./db";
import { emails } from "./emails";
import { sendMailLater } from "./mail";
import { notify } from "./notify";
import { getSetting } from "./settings";

/**
 * Switches on a PENDING payment: plan for 30 days (added to any time left on the same plan), credits,
 * invoice number, coupon use, receipt email and referral reward. Used by admin approval and card webhooks.
 */
export async function approvePayment(id: string, note: string | null = null) {
  const payment = await db.payment.findUnique({ where: { id }, include: { plan: true, user: true } });
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "PENDING") throw new Error("This payment was already reviewed.");

  const now = new Date();
  const samePlanStillActive = payment.user.planId === payment.planId && payment.user.planExpiresAt && payment.user.planExpiresAt > now;
  const base = samePlanStillActive ? payment.user.planExpiresAt! : now;
  const expires = new Date(base.getTime() + 30 * 86400000);

  const last = await db.payment.findFirst({ where: { invoiceNo: { not: null } }, orderBy: { invoiceNo: "desc" }, select: { invoiceNo: true } });
  const invoiceNo = (last?.invoiceNo ?? 1000) + 1;
  const firstPaid = (await db.payment.count({ where: { userId: payment.userId, status: "APPROVED" } })) === 0;

  await db.$transaction([
    db.payment.update({ where: { id }, data: { status: "APPROVED", adminNote: note, reviewedAt: now, invoiceNo } }),
    ...(payment.couponCode ? [db.coupon.updateMany({ where: { code: payment.couponCode }, data: { uses: { increment: 1 } } })] : []),
    db.user.update({
      where: { id: payment.userId },
      data: { planId: payment.planId, planExpiresAt: expires, credits: { increment: payment.plan.credits } },
    }),
  ]);
  sendMailLater(emails.paymentApproved(payment.user.email, payment.plan.name, payment.plan.credits, expires));

  if (firstPaid && payment.user.referredById && !payment.user.referralRewardedAt) {
    const reward = Math.max(0, Number(await getSetting("referral_credits")) || 0);
    const referrer = await db.user.findUnique({ where: { id: payment.user.referredById }, select: { id: true, ownerId: true, blocked: true } });
    if (referrer && !referrer.blocked && reward > 0) {
      await db.user.update({ where: { id: referrer.ownerId ?? referrer.id }, data: { credits: { increment: reward } } });
      await db.user.update({ where: { id: payment.userId }, data: { referralRewardedAt: now } });
      await notify(referrer.ownerId ?? referrer.id, `You earned ${reward} credits`, "Someone you invited just started a paid plan. Thank you!", "/billing");
    }
  }
  return { payment, expires, invoiceNo };
}

// ---------- Card payments (Lemon Squeezy) ----------
export const CARD_ENABLED = Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);

export async function createCardCheckout(opts: { variantId: string; email: string; wsId: string; planId: string; redirectUrl: string }) {
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { email: opts.email, custom: { ws_id: opts.wsId, plan_id: opts.planId } },
          product_options: { redirect_url: opts.redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: "variants", id: String(opts.variantId) } },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`The card payment page couldn't be created (${res.status}).`);
  const body = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = body.data?.attributes?.url;
  if (!url) throw new Error("The card payment page couldn't be created.");
  return url;
}
