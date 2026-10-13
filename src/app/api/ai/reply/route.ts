import { NextResponse } from "next/server";
import { aiBudget, callClaude, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";

export const maxDuration = 60;

const SYSTEM = `You help a small business owner handle replies from prospects.
Read the conversation so far and the prospect's newest reply. Decide what it means and write a good answer.
Answer in the same language and script the prospect used (English, Urdu, or Roman Urdu).
Keep the answer short, warm and specific. Never promise prices, discounts or results that the seller didn't state.
Reply ONLY with JSON:
{"intent": "INTERESTED" | "QUESTION" | "PRICE" | "LATER" | "NOT_INTERESTED" | "WRONG_PERSON" | "OTHER",
 "summary": "what they said, in a few words, in English",
 "stage": "NEW" | "CONTACTED" | "INTERESTED" | "WON" | "LOST",
 "followUpDays": number or null,
 "answer": "the reply to send them"}`;

/** POST { leadId, reply } — records their reply and suggests what to do next. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;

  const b = await req.json().catch(() => ({}));
  const reply = String(b?.reply ?? "").trim().slice(0, 3000);
  if (!reply) return fail("Paste what they wrote back.");
  const lead = await db.lead.findFirst({
    where: { id: String(b?.leadId ?? ""), userId: user.wsId },
    include: { activities: { where: { type: { in: ["MESSAGE", "NOTE"] } }, orderBy: { createdAt: "desc" }, take: 6 } },
  });
  if (!lead) return fail("Lead not found.", 404);
  const me = await db.user.findUnique({ where: { id: user.wsId }, select: { offer: true, businessName: true, name: true } });

  const history = lead.activities
    .reverse()
    .map((a) => `${a.type === "MESSAGE" ? "We sent" : "Note"}: ${a.body}`)
    .join("\n");

  try {
    aiBudget(user.wsId);
    const text = await callClaude(
      SYSTEM,
      `Seller: ${me?.businessName || me?.name}. Offer: ${me?.offer || "digital services for local businesses"}
Prospect: ${lead.title}${lead.category ? ` (${lead.category})` : ""}. Current stage: ${lead.status}.

Conversation so far:
${history || "(no earlier messages recorded)"}

Their newest reply:
${reply}`,
      900,
    );
    const out = parseJson<{ intent: string; summary: string; stage: string; followUpDays: number | null; answer: string }>(text);
    await logActivity(user.id, lead.id, "NOTE", `They replied: ${reply}`);
    // A reply ends any email sequence for this lead
    const active = await db.sequenceEnrollment.findMany({ where: { leadId: lead.id, status: "ACTIVE" }, select: { id: true } });
    if (active.length) {
      await db.sequenceEnrollment.updateMany({ where: { id: { in: active.map((a) => a.id) } }, data: { status: "REPLIED", endedAt: new Date() } });
      await db.emailMessage.updateMany({ where: { enrollmentId: { in: active.map((a) => a.id) }, status: "QUEUED" }, data: { status: "CANCELLED" } });
    }
    return NextResponse.json(out);
  } catch (err) {
    return aiFail(err);
  }
}
