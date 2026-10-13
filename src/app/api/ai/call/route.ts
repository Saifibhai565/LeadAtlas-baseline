import { NextResponse } from "next/server";
import { aiBudget, callClaude, describeLead, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const maxDuration = 60;

const LANG: Record<string, string> = {
  roman_urdu: "Roman Urdu (Urdu in English letters, as people speak in Pakistan)",
  urdu: "Urdu script",
  english: "English",
};

/** POST { leadId, language } — a short phone call script for this lead. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  const me = await db.user.findUnique({ where: { id: user.id }, select: { name: true, businessName: true, offer: true } });
  const language = LANG[b?.language] ? b.language : "roman_urdu";

  const system = `You write short phone call scripts for someone calling a local business for the first time.
Write in ${LANG[language]}. Natural spoken sentences, not formal writing. Keep the whole call under 2 minutes.
Use only the facts given. Never invent numbers or results.
Reply ONLY with JSON:
{"opening": "first 2 sentences: who you are and why you're calling, asking if it's a good time",
 "questions": ["2-3 short questions to understand their situation"],
 "pitch": "2-3 sentences connecting one specific fact about them to the offer",
 "objections": [{"they": "a likely objection", "you": "a calm short answer"}],
 "close": "one sentence asking for a small next step (sending a sample, a short meeting)",
 "voicemail": "a 15-second message to leave if nobody answers"}`;

  try {
    aiBudget(user.wsId);
    const problems = lead.website ? issueList(lead.auditIssues).map((i) => ISSUE_INFO[i].label) : [];
    const out = parseJson<Record<string, unknown>>(
      await callClaude(
        system,
        `Caller: ${me?.name}${me?.businessName ? ` from ${me.businessName}` : ""}. Offer: ${me?.offer || "websites and online marketing for local businesses"}\n\n${describeLead(lead, problems)}`,
        1000,
      ),
    );
    return NextResponse.json({ script: out });
  } catch (err) {
    return aiFail(err);
  }
}
