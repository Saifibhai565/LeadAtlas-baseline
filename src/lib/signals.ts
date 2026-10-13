/** Lead signals: short reasons why now is a good moment to contact a business. Pure functions (server and browser). */
export const SIGNAL_INFO: Record<string, { label: string; tip: string; points: number }> = {
  BUSY: { label: "Busy", tip: "Google shows them as busy most days. They have customers and money, but may not be investing online.", points: 5 },
  NEW_BIZ: { label: "Recently opened", tip: "Their reviews only go back a few months. New businesses buy websites, logos and marketing.", points: 8 },
  SOCIAL_ONLY: { label: "Social page as website", tip: "Their “website” is a Facebook, Instagram or free page. A real site is an easy pitch.", points: 20 },
  ADS: { label: "Runs ads", tip: "Their website has an ad tracking pixel. They already spend on marketing.", points: 5 },
  MOBILE: { label: "Mobile number", tip: "Their number is a mobile, so WhatsApp is likely.", points: 3 },
  CHAIN: { label: "Has branches", tip: "Several locations share this name or website. Bigger business, bigger deal.", points: 5 },
  DOMAIN_EXPIRING: { label: "Domain expiring", tip: "Their website address expires within 60 days. A natural moment to talk about the site.", points: 10 },
  HAS_OWNER: { label: "Owner name known", tip: "We found the owner's or doctor's name, so you can address them personally.", points: 2 },
  RATING_DROP: { label: "Rating dropped", tip: "Their Google rating went down recently. Reputation help is timely.", points: 8 },
  BAD_REVIEW: { label: "New bad review", tip: "They got a new 1 or 2 star review recently.", points: 6 },
};

const SOCIAL_HOSTS = /(^|\.)(facebook\.com|fb\.com|instagram\.com|wixsite\.com|blogspot\.com|wordpress\.com|business\.site|sites\.google\.com|linktr\.ee|tiktok\.com|wa\.me|youtube\.com)$/i;

export function isSocialOnly(website: string | null | undefined) {
  if (!website) return false;
  try {
    return SOCIAL_HOSTS.test(new URL(website.startsWith("http") ? website : `https://${website}`).hostname);
  } catch {
    return false;
  }
}

/** "3 months ago" -> 3 ; "a year ago" -> 12 ; null if unknown */
function monthsAgo(when: string) {
  const w = when.toLowerCase();
  const n = Number(w.match(/\d+/)?.[0] ?? (/(^|\s)(a|an)\s/.test(w) ? 1 : NaN));
  if (!Number.isFinite(n)) return null;
  if (w.includes("year")) return n * 12;
  if (w.includes("month")) return n;
  if (w.includes("week")) return n / 4;
  if (w.includes("day") || w.includes("hour") || w.includes("minute")) return 0;
  return null;
}

/** Average of each day's busiest hour, 0-100. Google's popular times are percentages. */
export function busyLevel(popularTimesJson: string | null | undefined) {
  if (!popularTimesJson) return null;
  try {
    const pt = JSON.parse(popularTimesJson) as Record<string, Record<string, number>>;
    const peaks = Object.values(pt)
      .map((d) => Math.max(0, ...Object.values(d ?? {}).map(Number).filter(Number.isFinite)))
      .filter((v) => v > 0);
    return peaks.length ? Math.round(peaks.reduce((a, b) => a + b, 0) / peaks.length) : null;
  } catch {
    return null;
  }
}

/** A quiet hour while they're open, from popular times. */
export function bestContactTime(popularTimesJson: string | null | undefined) {
  if (!popularTimesJson) return null;
  try {
    const pt = JSON.parse(popularTimesJson) as Record<string, Record<string, number>>;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday"].filter((d) => pt[d]);
    if (!days.length) return null;
    const avg: Record<number, number[]> = {};
    for (const d of days) for (const [h, v] of Object.entries(pt[d])) if (Number(v) > 0) (avg[Number(h)] ??= []).push(Number(v));
    const hours = Object.entries(avg)
      .map(([h, vs]) => ({ h: Number(h), v: vs.reduce((a, b) => a + b, 0) / vs.length }))
      .filter((x) => x.h >= 9 && x.h <= 19)
      .sort((a, b) => a.v - b.v);
    if (!hours.length) return null;
    const h = hours[0].h;
    const fmt = (x: number) => `${((x + 11) % 12) + 1}${x < 12 ? "am" : "pm"}`;
    return `Mon to Thu, around ${fmt(h)} to ${fmt(h + 1)} (quietest time while open)`;
  } catch {
    return null;
  }
}

export type SignalLead = {
  website: string | null;
  phone: string | null;
  tech: string | null;
  reviews: string | null;
  reviewCount: number | null;
  popularTimes: string | null;
  ownerName: string | null;
  domainExpiresAt: Date | string | null;
  branches: number | null;
  lastSignal: string | null;
  lastSignalAt: Date | string | null;
};

export function computeSignals(l: SignalLead, mobileCountryPrefix = "923"): string[] {
  const out: string[] = [];
  const busy = busyLevel(l.popularTimes);
  if (busy != null && busy >= 60) out.push("BUSY");

  try {
    const reviews = l.reviews ? (JSON.parse(l.reviews) as { w: string }[]) : [];
    const ages = reviews.map((r) => monthsAgo(r.w ?? "")).filter((x): x is number => x != null);
    const total = l.reviewCount ?? 0;
    if (ages.length >= Math.min(total, 5) && total > 0 && total <= 30 && Math.max(...ages) <= 6) out.push("NEW_BIZ");
  } catch {
    /* ignore */
  }

  if (isSocialOnly(l.website)) out.push("SOCIAL_ONLY");
  if (/Facebook Pixel|Google Ads/.test(l.tech ?? "")) out.push("ADS");
  const digits = (l.phone ?? "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  if (intl.startsWith(mobileCountryPrefix) && intl.length === 12) out.push("MOBILE");
  if ((l.branches ?? 0) >= 2) out.push("CHAIN");
  if (l.domainExpiresAt) {
    const days = (new Date(l.domainExpiresAt).getTime() - Date.now()) / 86400_000;
    if (days > -30 && days <= 60) out.push("DOMAIN_EXPIRING");
  }
  if (l.ownerName) out.push("HAS_OWNER");
  if (l.lastSignal && l.lastSignalAt && Date.now() - new Date(l.lastSignalAt).getTime() < 30 * 86400_000) {
    for (const s of l.lastSignal.split(",")) if (SIGNAL_INFO[s] && !out.includes(s)) out.push(s);
  }
  return out;
}

export function signalPoints(signals: string | null | undefined) {
  return (signals ?? "")
    .split(",")
    .filter(Boolean)
    .reduce((sum, s) => sum + (SIGNAL_INFO[s]?.points ?? 0), 0);
}
