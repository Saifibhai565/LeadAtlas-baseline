import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { aiBudget, callClaude, describeLead, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const maxDuration = 90;

const SYSTEM = `You write a short, friendly one-page proposal from a small agency to a local business.
Use only the facts given about the business. Use the price and timeline exactly as given; if none is given, write "To be agreed".
Plain words, no jargon, no hype, no invented results or statistics.
Reply ONLY with JSON:
{"title": "short title", "intro": "2 sentences addressed to the business",
 "problems": ["2-4 specific things holding them back, from the facts"],
 "solution": ["3-5 concrete things the agency will do"],
 "deliverables": ["what they get at the end"],
 "price": "as given", "timeline": "as given",
 "next": "one sentence on what happens after they accept"}`;

/** POST { leadId, price?, timeline?, language? } — writes a proposal and returns its public link. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  const me = await db.user.findUnique({ where: { id: user.wsId }, select: { offer: true, businessName: true, brandName: true, name: true } });
  const price = String(b?.price ?? "").trim().slice(0, 80);
  const timeline = String(b?.timeline ?? "").trim().slice(0, 80);
  const language = b?.language === "urdu" ? "Urdu" : b?.language === "roman_urdu" ? "Roman Urdu" : "English";

  try {
    aiBudget(user.wsId, 2);
    const problems = lead.website ? issueList(lead.auditIssues).map((i) => ISSUE_INFO[i].pitch) : [];
    const out = parseJson<Record<string, unknown>>(
      await callClaude(
        `${SYSTEM}\nWrite in ${language}.`,
        `Agency: ${me?.brandName || me?.businessName || me?.name}. What they offer: ${me?.offer || "websites and online marketing"}
Price: ${price || "not given"}. Timeline: ${timeline || "not given"}.

${describeLead(lead, problems)}`,
        1500,
      ),
    );
    const token = lead.proposalToken ?? randomBytes(12).toString("base64url");
    await db.lead.update({
      where: { id: lead.id },
      data: { proposal: JSON.stringify(out), proposalToken: token, proposalAt: new Date(), proposalViewedAt: null, proposalAcceptedAt: null },
    });
    return NextResponse.json({ path: `/p/${token}`, proposal: out });
  } catch (err) {
    return aiFail(err);
  }
}
