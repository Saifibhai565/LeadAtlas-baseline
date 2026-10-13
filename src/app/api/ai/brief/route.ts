import { NextResponse } from "next/server";
import { aiBudget, callClaude, describeLead, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const maxDuration = 60;

type Brief = { summary: string; needs: string[]; pitch: string; objection: string; answer: string; channel: string };

const SYSTEM = `You are a sales coach for someone who sells services to local businesses.
Given facts about one business and what the seller offers, write a short brief.
Only use the facts given. If something is unknown, say so instead of guessing.
Reply ONLY with JSON:
{"summary": "one sentence on who they are", "needs": ["2-3 specific things they likely need, tied to the facts"],
 "pitch": "the single best angle to open with, one or two sentences",
 "objection": "the most likely objection", "answer": "how to answer it, one sentence",
 "channel": "WhatsApp, email or phone call, and why in a few words"}`;

/** POST { leadId } — writes and saves an AI brief for the lead. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;

  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  const me = await db.user.findUnique({ where: { id: user.wsId }, select: { offer: true, businessName: true } });

  try {
    aiBudget(user.wsId);
    const problems = lead.website ? issueList(lead.auditIssues).map((i) => ISSUE_INFO[i].label) : [];
    let reviewNote = "";
    try {
      const ins = lead.aiReviews ? JSON.parse(lead.aiReviews) : null;
      const list: { r: number; t: string }[] = lead.reviews ? JSON.parse(lead.reviews) : [];
      if (ins?.complaints?.length) reviewNote = `\nWhat reviews complain about: ${ins.complaints.join("; ")}`;
      else if (list.length) reviewNote = `\nSample reviews: ${list.slice(0, 6).map((r) => `${r.r}★ ${r.t.slice(0, 160)}`).join(" | ")}`;
    } catch {
      reviewNote = "";
    }
    const text = await callClaude(
      SYSTEM,
      `What the seller offers: ${me?.offer || "websites, social media and online marketing for local businesses"}\n\n${describeLead(lead, problems)}${reviewNote}`,
      900,
    );
    const brief = parseJson<Brief>(text);
    await db.lead.update({ where: { id: lead.id }, data: { aiBrief: JSON.stringify(brief), aiBriefAt: new Date() } });
    return NextResponse.json({ brief });
  } catch (err) {
    return aiFail(err);
  }
}
