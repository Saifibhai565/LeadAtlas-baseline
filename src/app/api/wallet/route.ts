import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { leadPrice, walletInfo } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const [w, price, txns, deposits, methods] = await Promise.all([
    walletInfo(user.wsId),
    leadPrice(),
    db.walletTxn.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.deposit.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.paymentMethod.findMany({ where: { active: true, kind: { in: ["CRYPTO", "BANK"] } }, orderBy: [{ sort: "asc" }], select: { id: true, name: true, kind: true, currency: true, network: true, accountTitle: true, accountNumber: true, details: true, qrImage: true } }),
  ]);
  return NextResponse.json({ ...w, price: price.price, priceCurrency: price.currency, minDeposit: price.minDeposit, txns, deposits, methods, isOwner: user.isOwner });
}
