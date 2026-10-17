import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { leadPrice } from "@/lib/wallet";

/** POST { amount, method, reference } — records a deposit for the admin to confirm. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can deposit.", 403);
  const b = await req.json().catch(() => ({}));
  const amount = Math.round(Number(b?.amount));
  const { minDeposit } = await leadPrice();
  if (!(amount > 0)) return fail("Enter the amount you sent.");
  if (amount < minDeposit) return fail(`The minimum deposit is ${minDeposit}.`);
  const reference = String(b?.reference ?? "").trim().slice(0, 200);
  if (reference.length < 4) return fail("Enter the transaction hash or bank reference.");
  const method = String(b?.method ?? "OTHER").slice(0, 40);
  await db.deposit.create({ data: { userId: user.wsId, amount, currency: "USD", method, reference } });
  return NextResponse.json({ ok: true });
}
