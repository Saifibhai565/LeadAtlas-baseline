import { NextResponse } from "next/server";
import { aiBudget, callClaude, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const maxDuration = 30;

const ALLOWED: Record<string, (v: string) => boolean> = {
  q: (v) => v.length <= 80,
  category: (v) => v.length <= 120,
  status: (v) => ["NEW", "CONTACTED", "INTERESTED", "WON", "LOST"].includes(v),
  phone: (v) => v === "1",
  email: (v) => v === "1",
  website: (v) => v === "0" || v === "1",
  minRating: (v) => ["3", "4", "4.5"].includes(v),
  minReviews: (v) => ["10", "50", "200"].includes(v),
  issue: (v) => ["SITE_DOWN", "NO_HTTPS", "NOT_MOBILE", "SLOW", "NO_DESCRIPTION", "NO_TITLE"].includes(v),
  socials: (v) => v === "1",
  tag: (v) => v.length <= 30,
  signal: (v) => ["BUSY", "NEW_BIZ", "SOCIAL_ONLY", "ADS", "MOBILE", "CHAIN", "DOMAIN_EXPIRING", "HAS_OWNER", "RATING_DROP", "BAD_REVIEW"].includes(v),
  tech: (v) => v.length <= 40,
  unhappy: (v) => v === "1",
  emailValid: (v) => v === "1",
  followUp: (v) => v === "due",
  sort: (v) => v === "score",
  assigned: (v) => v === "me",
};

/** POST { question } — turns a plain-language question into lead filters. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const question = String(b?.question ?? "").trim().slice(0, 300);
  if (!question) return fail("Ask something like “restaurants with good ratings but no website”.");

  const cats = await db.lead.groupBy({
    by: ["category"],
    where: { userId: user.wsId, category: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
    take: 80,
  });

  const system = `Convert a question about a list of business leads into filters.
Available filters (use only these keys, all values are strings):
- q: free text matched against name, address, phone, email (use for a city or area name, or a business name)
- category: one EXACT value from this list: ${cats.map((c) => JSON.stringify(c.category)).join(", ") || "(none yet)"}
- status: NEW | CONTACTED | INTERESTED | WON | LOST
- phone: "1" (has phone) ; email: "1" (has email) ; website: "1" has / "0" no website
- minRating: "3" | "4" | "4.5" ; minReviews: "10" | "50" | "200"
- issue: SITE_DOWN | NO_HTTPS | NOT_MOBILE | SLOW | NO_DESCRIPTION | NO_TITLE
- tag: one of the user's own tags (lowercase) when they mention a tag or label
- signal: BUSY | NEW_BIZ (recently opened) | SOCIAL_ONLY (only a social page as website) | ADS (runs ads) | MOBILE | CHAIN (has branches) | DOMAIN_EXPIRING | RATING_DROP | BAD_REVIEW
- tech: website technology, e.g. WordPress, Shopify, Wix
- unhappy: "1" (has several 1-2 star reviews) ; socials: "1" ; emailValid: "1" ; followUp: "due" ; sort: "score" (best first) ; assigned: "me"
Reply ONLY with JSON: {"filters": {...}, "explanation": "what you filtered, in plain words"}`;

  try {
    aiBudget(user.wsId);
    const out = parseJson<{ filters: Record<string, string>; explanation?: string }>(await callClaude(system, question, 500));
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(out.filters ?? {})) {
      const val = String(v);
      if (ALLOWED[k]?.(val)) params.set(k, val);
    }
    return NextResponse.json({ query: params.toString(), explanation: out.explanation ?? null });
  } catch (err) {
    return aiFail(err);
  }
}
