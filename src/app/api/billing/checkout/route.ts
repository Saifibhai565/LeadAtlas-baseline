import { NextResponse } from "next/server";
import { CARD_ENABLED, createCardCheckout } from "@/lib/billing";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { appUrl } from "@/lib/mail";

/** POST { planId } — returns a card payment page URL. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can pay for the plan.", 403);
  if (!CARD_ENABLED) return fail("Card payments aren't set up on this server.", 503);
  const b = await req.json().catch(() => ({}));
  const plan = await db.plan.findFirst({ where: { id: String(b?.planId ?? ""), active: true } });
  if (!plan?.lsVariantId) return fail("This plan can't be paid by card yet.");
  try {
    const url = await createCardCheckout({
      variantId: plan.lsVariantId,
      email: user.email,
      wsId: user.wsId,
      planId: plan.id,
      redirectUrl: appUrl("/billing?paid=1"),
    });
    return NextResponse.json({ url });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Couldn't start the card payment.", 502);
  }
}
