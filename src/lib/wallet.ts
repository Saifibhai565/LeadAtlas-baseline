import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";

export async function walletInfo(wsId: string) {
  const u = await db.user.findUnique({ where: { id: wsId }, select: { walletBalance: true, walletCurrency: true } });
  return { balance: u?.walletBalance ?? 0, currency: u?.walletCurrency ?? "USD" };
}

/** Changes a wallet balance and records the transaction, atomically. Returns the new balance. */
export async function adjustWallet(wsId: string, delta: number, reason: string, detail?: string) {
  return db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: wsId }, select: { walletBalance: true } });
    const balance = (u?.walletBalance ?? 0) + delta;
    if (balance < 0) throw new Error("Not enough balance in your wallet.");
    await tx.user.update({ where: { id: wsId }, data: { walletBalance: balance } });
    await tx.walletTxn.create({ data: { userId: wsId, delta, balance, reason, detail: detail?.slice(0, 300) ?? null } });
    return balance;
  });
}

export async function leadPrice() {
  const s = await getSettings();
  return { price: Math.max(0, Number(s.lead_price) || 0), currency: s.lead_price_currency || "USD", minDeposit: Math.max(0, Number(s.min_deposit) || 0) };
}
