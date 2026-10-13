import { NextResponse } from "next/server";
import { aiBudget, callClaude, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const maxDuration = 60;

const SYSTEM = `You read a local business's Google reviews for someone who wants to sell that business a service.
Find the patterns. Quote nothing longer than a few words. Do not invent anything that isn't in the reviews.
Reply ONLY with JSON:
{"summary": "one sentence on how customers feel overall",
 "praises": ["up to 3 things customers love"],
 "complaints": ["up to 3 recurring problems, most frequent first; empty if none"],
 "opportunities": ["up to 3 ways a service provider could help, each tied to a complaint or gap"],
 "pitch": "one opening line for a message that mentions what customers say, politely, without shaming the owner"}`;

/** POST { leadId } — turns the lead's saved reviews into insights. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;

  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  let reviews: { r: number; t: string; w: string }[] = [];
  try {
    reviews = lead.reviews ? JSON.parse(lead.reviews) : [];
  } catch {
    reviews = [];
  }
  const withText = reviews.filter((r) => r.t);
  if (withText.length < 2) return fail("This lead has too few written reviews to analyse. Run its search again with “Collect more reviews”.");
  const me = await db.user.findUnique({ where: { id: user.wsId }, select: { offer: true } });

  try {
    aiBudget(user.wsId);
    const out = parseJson<Record<string, unknown>>(
      await callClaude(
        SYSTEM,
        `Business: ${lead.title}${lead.category ? ` (${lead.category})` : ""}. Rating ${lead.rating ?? "?"} from ${lead.reviewCount ?? "?"} reviews.
Seller offers: ${me?.offer || "digital services for local businesses"}

Reviews:
${withText.map((r) => `- ${r.r}★ ${r.w ? `(${r.w}) ` : ""}${r.t}`).join("\n")}`,
        900,
      ),
    );
    await db.lead.update({ where: { id: lead.id }, data: { aiReviews: JSON.stringify(out), aiReviewsAt: new Date() } });
    return NextResponse.json({ insights: out });
  } catch (err) {
    return aiFail(err);
  }
}
