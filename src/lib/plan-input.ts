export function planInput(b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().slice(0, 40);
  const price = Math.round(Number(b.price));
  const credits = Math.round(Number(b.credits));
  const seats = Math.round(Number(b.seats ?? 1));
  if (!name) return { error: "Name the plan." } as const;
  if (!(price >= 0)) return { error: "Price must be 0 or more." } as const;
  if (!(credits >= 0)) return { error: "Credits must be 0 or more." } as const;
  if (!(seats >= 1 && seats <= 500)) return { error: "Seats must be between 1 and 500." } as const;
  return {
    data: {
      name,
      price,
      credits,
      seats,
      currency: String(b.currency ?? "PKR").trim().toUpperCase().slice(0, 5) || "PKR",
      ai: Boolean(b.ai),
      api: Boolean(b.api),
      outreach: Boolean(b.outreach),
      whiteLabel: Boolean(b.whiteLabel),
      lsVariantId: String(b.lsVariantId ?? "").trim() || null,
      priceUsd: b.priceUsd === "" || b.priceUsd == null ? null : Math.max(0, Math.round(Number(b.priceUsd))) || null,
      active: b.active === undefined ? true : Boolean(b.active),
      sort: Math.round(Number(b.sort ?? 0)) || 0,
      blurb: String(b.blurb ?? "").trim().slice(0, 160) || null,
    },
  } as const;
}
