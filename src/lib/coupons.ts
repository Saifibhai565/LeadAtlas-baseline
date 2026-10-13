import "server-only";
import { db } from "./db";

export type CouponCheck =
  | { ok: true; code: string; discount: number; final: number; label: string }
  | { ok: false; error: string };

/** Works out what a coupon takes off a plan. Counts approved and waiting payments against the use limit. */
export async function checkCoupon(rawCode: string, plan: { id: string; price: number; currency: string }): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };
  const c = await db.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: "That coupon code isn't valid." };
  if (c.expiresAt && c.expiresAt < new Date()) return { ok: false, error: "That coupon has expired." };
  if (c.planId && c.planId !== plan.id) return { ok: false, error: "That coupon is for a different plan." };
  if (c.maxUses != null) {
    const pending = await db.payment.count({ where: { couponCode: code, status: "PENDING" } });
    if (c.uses + pending >= c.maxUses) return { ok: false, error: "That coupon has been fully used." };
  }
  const discount = Math.min(plan.price, c.percent > 0 ? Math.round((plan.price * c.percent) / 100) : c.amount);
  return {
    ok: true,
    code,
    discount,
    final: plan.price - discount,
    label: c.percent > 0 ? `${c.percent}% off` : `${plan.currency} ${c.amount.toLocaleString("en-US")} off`,
  };
}
