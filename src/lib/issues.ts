/** Plain-language names for website problems. These are sales openings for agencies. */
export const ISSUE_INFO: Record<string, { label: string; pitch: string }> = {
  SITE_DOWN: { label: "Website not working", pitch: "Their website doesn't open. Customers who try it leave." },
  NO_HTTPS: { label: "Shows “Not secure”", pitch: "Browsers warn visitors that the site isn't secure." },
  NOT_MOBILE: { label: "Not mobile-friendly", pitch: "The site isn't built for phones, where most visitors are." },
  SLOW: { label: "Slow to load", pitch: "The homepage takes more than 3 seconds to load." },
  NO_DESCRIPTION: { label: "No Google description", pitch: "Google has no summary to show under their name in search." },
  NO_TITLE: { label: "No page title", pitch: "The site has no title, which hurts how it appears in search." },
};

export const ISSUE_KEYS = Object.keys(ISSUE_INFO);

export function issueList(raw: string | null | undefined) {
  return (raw ?? "").split(",").map((s) => s.trim()).filter((s) => s in ISSUE_INFO);
}

export function scoreTone(score: number | null | undefined) {
  if (score == null) return "neutral" as const;
  if (score >= 80) return "ok" as const;
  if (score >= 50) return "pin" as const;
  return "danger" as const;
}
