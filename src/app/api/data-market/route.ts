import { NextResponse } from "next/server";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { countAvailable } from "@/lib/marketplace-data";
import { leadPrice, walletInfo } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/** GET ?q=restaurant in USA — how many leads are available to buy and at what price. */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const [{ price, currency }, wallet] = await Promise.all([leadPrice(), walletInfo(user.wsId)]);
  if (!q) return NextResponse.json({ price, currency, balance: wallet.balance });
  const { total, newCount } = await countAvailable(user.wsId, q);
  return NextResponse.json({ q, total, newCount, price, currency, balance: wallet.balance, canAfford: price > 0 ? Math.floor(wallet.balance / price) : newCount });
}
