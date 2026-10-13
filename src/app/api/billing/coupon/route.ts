import { NextResponse } from "next/server";
import { checkCoupon } from "@/lib/coupons";
import { amountFor } from "@/lib/method-input";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { allow } from "@/lib/ratelimit";

/** POST { planId, code } — previews what a coupon takes off. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!allow(`coupon:${user.id}`, 20, 60 * 60_000)) return fail("Too many tries. Wait a while.", 429);
  const b = await req.json().catch(() => ({}));
  const plan = await db.plan.findFirst({ where: { id: String(b?.planId ?? ""), active: true } });
  if (!plan) return fail("Choose a plan.");
  const pm = b?.methodId ? await db.paymentMethod.findFirst({ where: { id: String(b.methodId) } }) : null;
  const base = pm ? amountFor(plan, pm.currency) : plan.price;
  if (base == null) return fail("This plan has no price in that currency.");
  const c = await checkCoupon(String(b?.code ?? ""), { ...plan, price: base, currency: pm?.currency ?? plan.currency });
  if (!c.ok) return fail(c.error);
  return NextResponse.json(c);
}
