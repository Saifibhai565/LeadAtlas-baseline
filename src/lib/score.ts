import { signalPoints } from "./signals";

/**
 * Lead score, 0-100. Higher = easier to reach and more likely to need help.
 * Pure function so it can run on the server and in the browser.
 */
export type Scorable = {
  phone?: string | null;
  emails?: string | null;
  emailStatus?: string | null;
  socials?: string | null;
  website?: string | null;
  auditScore?: number | null;
  enrichStatus?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  category?: string | null;
  signals?: string | null;
};

export function scoreLead(l: Scorable, boosts?: Record<string, number>): number {
  let s = 0;

  // Can we reach them? (max 30)
  if (l.phone) s += 15;
  if (l.emails) s += l.emailStatus === "VALID" ? 12 : 7;
  if (l.socials) s += 3;

  // Do they need what agencies sell? (max 30)
  if (!l.website) s += 30;
  else if (l.enrichStatus === "DONE" && l.auditScore != null) s += Math.round((100 - l.auditScore) * 0.3);
  else s += 8; // not checked yet

  // Are they an active, real business? (max 25, smooth so leads don't all tie)
  const reviews = l.reviewCount ?? 0;
  s += Math.min(15, Math.round(Math.log10(reviews + 1) * 6));
  if (l.rating != null) s += Math.max(0, Math.min(10, Math.round((l.rating - 3) * 5)));

  // Lead signals (busy, recently opened, runs ads...), capped
  if (l.signals) s += Math.min(15, signalPoints(l.signals));

  // Learned from this workspace's won and lost deals
  if (boosts && l.category && boosts[l.category]) s += boosts[l.category];

  return Math.max(0, Math.min(100, s));
}

export function scoreLabel(score: number | null | undefined) {
  if (score == null) return "Not scored";
  if (score >= 70) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}
