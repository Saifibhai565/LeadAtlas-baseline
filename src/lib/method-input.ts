export const CRYPTO_NETWORKS = ["TRC20", "BEP20", "ERC20", "Polygon", "Solana", "Bitcoin"] as const;

export function methodInput(b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().slice(0, 60);
  const kind = ["BANK", "WALLET", "CRYPTO", "OTHER"].includes(String(b.kind)) ? String(b.kind) : "OTHER";
  const currency = String(b.currency ?? "PKR").trim().toUpperCase().slice(0, 8) || "PKR";
  const network = kind === "CRYPTO" ? String(b.network ?? "").trim().slice(0, 20) || null : null;
  const qr = String(b.qrImage ?? "");
  if (!name) return { error: "Name the payment method." } as const;
  if (kind === "CRYPTO" && !network) return { error: "Choose the network (for example TRC20 or BEP20)." } as const;
  if (kind === "CRYPTO" && !String(b.accountNumber ?? "").trim()) return { error: "Enter the wallet address." } as const;
  if (qr && (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(qr) || qr.length > 400_000)) return { error: "QR must be a PNG/JPG under 300 KB." } as const;
  return {
    data: {
      name,
      kind,
      currency,
      network,
      accountTitle: String(b.accountTitle ?? "").trim().slice(0, 100) || null,
      accountNumber: String(b.accountNumber ?? "").trim().slice(0, 200) || null,
      details: String(b.details ?? "").trim().slice(0, 1000) || null,
      qrImage: qr || null,
      active: b.active === undefined ? true : Boolean(b.active),
      sort: Math.round(Number(b.sort ?? 0)) || 0,
    },
  } as const;
}

/** Plans are priced in their own currency; dollar and stablecoin methods use the plan's USD price. */
export function amountFor(plan: { price: number; currency: string; priceUsd: number | null }, methodCurrency: string) {
  if (methodCurrency === plan.currency) return plan.price;
  if (["USD", "USDT", "USDC", "BUSD", "DAI"].includes(methodCurrency) && plan.priceUsd != null) return plan.priceUsd;
  return null;
}

export function explorerUrl(network: string | null | undefined, hash: string) {
  const h = encodeURIComponent(hash.trim());
  switch ((network ?? "").toUpperCase()) {
    case "TRC20":
      return `https://tronscan.org/#/transaction/${h}`;
    case "BEP20":
      return `https://bscscan.com/tx/${h}`;
    case "ERC20":
      return `https://etherscan.io/tx/${h}`;
    case "POLYGON":
      return `https://polygonscan.com/tx/${h}`;
    case "SOLANA":
      return `https://solscan.io/tx/${h}`;
    case "BITCOIN":
      return `https://mempool.space/tx/${h}`;
    default:
      return null;
  }
}
