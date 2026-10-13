import { NextResponse } from "next/server";
import { aiBudget, callClaude } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** POST { leadId, index, language } — a reply the business owner can post under a Google review. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId }, select: { title: true, category: true, reviews: true } });
  if (!lead) return fail("Not found.", 404);
  let reviews: { n: string; r: number; t: string }[] = [];
  try {
    reviews = lead.reviews ? JSON.parse(lead.reviews) : [];
  } catch {
    reviews = [];
  }
  const r = reviews[Number(b?.index)];
  if (!r) return fail("Review not found.");
  const language = b?.language === "urdu" ? "Urdu" : b?.language === "roman_urdu" ? "Roman Urdu" : "the same language as the review";
  try {
    aiBudget(user.wsId);
    const text = await callClaude(
      `You write the business owner's public reply to a Google review. Write in ${language}. 40 to 80 words. Warm, specific to what they said, never defensive.
For a bad review: thank them, apologise for the experience without admitting legal fault, and invite them to get in touch privately. For a good review: thank them by first name and mention what they liked.
Return only the reply text.`,
      `Business: ${lead.title}${lead.category ? ` (${lead.category})` : ""}\nReviewer: ${r.n.split(" ")[0]}\nStars: ${r.r}\nReview: ${r.t}`,
      400,
    );
    return NextResponse.json({ reply: text.trim() });
  } catch (err) {
    return aiFail(err);
  }
}
