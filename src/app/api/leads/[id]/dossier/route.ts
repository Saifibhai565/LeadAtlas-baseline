import { NextResponse } from "next/server";
import { aiBudget, callClaude, describeLead, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const maxDuration = 90;

const SYSTEM = `You write a one-page research briefing for a salesperson before they contact a local business.
Use only the facts given; never invent numbers, owners, prices or history. Keep it tight and practical.
Reply ONLY with JSON:
{"summary": "2 sentences on what this business is and how it's doing",
 "strengths": ["2-4 things going well for them"],
 "weaknesses": ["2-4 gaps you could help with, from the facts"],
 "openingLine": "one natural first line for a message or call, specific to them",
 "talkingPoints": ["3-4 things to raise on the call"],
 "objections": [{"they": "a likely objection", "you": "a short answer"}],
 "bestChannel": "phone | whatsapp | email, with one reason"}`;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  const me = await db.user.findUnique({ where: { id: user.wsId }, select: { offer: true, businessName: true, brandName: true } });

  // Gather everything we know, in words
  const problems = lead.website ? issueList(lead.auditIssues).map((i) => ISSUE_INFO[i].pitch) : [];
  let intelLines = "";
  try {
    const intel = lead.intel ? JSON.parse(lead.intel) : {};
    intelLines = [
      intel.psiMobile != null ? `Google speed score ${intel.psiMobile}/100 on mobile` : null,
      intel.domainAgeYears != null ? `website is ${intel.domainAgeYears} years old` : null,
      intel.sslDaysLeft != null && intel.sslDaysLeft < 30 ? `security certificate expires in ${intel.sslDaysLeft} days` : null,
      intel.unsafe ? `Google flags the site as unsafe` : null,
      intel.careersUrl ? "they are hiring" : null,
      intel.reviewsLast90 != null ? `${intel.reviewsLast90} reviews in the last 3 months` : null,
    ].filter(Boolean).join("; ");
  } catch {
    intelLines = "";
  }
  const signals = (lead.signals ?? "").split(",").filter(Boolean).join(", ");

  try {
    aiBudget(user.wsId, 2);
    const out = parseJson<Record<string, unknown>>(
      await callClaude(
        SYSTEM,
        `Salesperson works for: ${me?.brandName || me?.businessName || "an agency"}. They offer: ${me?.offer || "websites and online marketing for local businesses"}

${describeLead(lead, problems)}
${intelLines ? `More: ${intelLines}` : ""}
${signals ? `Signals: ${signals}` : ""}`,
        1600,
      ),
    );
    await db.lead.update({ where: { id }, data: { dossier: JSON.stringify(out), dossierAt: new Date() } });
    return NextResponse.json({ dossier: out });
  } catch (err) {
    return aiFail(err);
  }
}
