/** A quick check of a business's Google Maps profile, from what the search saved. */
export type GbpLead = {
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  lowReviews: number | null;
  openHours: string | null;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
};

export type GbpItem = { ok: boolean; label: string; tip: string };

export function gbpAudit(l: GbpLead): { score: number; items: GbpItem[] } {
  const items: GbpItem[] = [
    { ok: Boolean(l.website), label: "Website link", tip: "No website on the profile. People who find them can't learn more or book." },
    { ok: Boolean(l.phone), label: "Phone number", tip: "No phone number, so customers can't call from Google Maps." },
    { ok: Boolean(l.openHours && l.openHours !== "{}" && l.openHours !== "null"), label: "Opening hours", tip: "No opening hours. Google shows these prominently, and customers skip places without them." },
    { ok: Boolean(l.description), label: "Business description", tip: "No description, so Google has little to show about what they offer." },
    { ok: Boolean(l.thumbnail), label: "Photos", tip: "No main photo. Profiles with photos get far more clicks." },
    { ok: (l.reviewCount ?? 0) >= 20, label: "Enough reviews", tip: `Only ${l.reviewCount ?? 0} reviews. A review-request routine would build trust quickly.` },
    { ok: (l.rating ?? 0) >= 4, label: "Rating 4.0 or higher", tip: `Rating is ${l.rating ?? "missing"}. Below 4 stars many customers move on.` },
    { ok: (l.lowReviews ?? 0) < 2, label: "Few unhappy reviews", tip: `${l.lowReviews ?? 0} one- or two-star reviews. Replying to them publicly helps.` },
  ];
  const score = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { score, items };
}
