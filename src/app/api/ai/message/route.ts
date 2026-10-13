import { NextResponse } from "next/server";
import { AI_ENABLED, writeMessage, type WriterInput } from "@/lib/ai";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const maxDuration = 60;

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  return NextResponse.json({ enabled: AI_ENABLED && user.canUseAI, configured: AI_ENABLED, allowed: user.canUseAI });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!AI_ENABLED) return fail("The AI writer needs ANTHROPIC_API_KEY in your .env file.", 503);
  if (!user.canUseAI) return fail("AI features are part of the Pro and Agency plans. Upgrade on the Billing page.", 402);

  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  const me = await db.user.findUnique({ where: { id: user.id }, select: { name: true, businessName: true, offer: true } });

  const channel: WriterInput["channel"] = b?.channel === "EMAIL" ? "EMAIL" : "WHATSAPP";
  const language: WriterInput["language"] = ["english", "urdu", "roman_urdu"].includes(b?.language) ? b.language : "english";
  const tone: WriterInput["tone"] = ["friendly", "professional", "short"].includes(b?.tone) ? b.tone : "friendly";

  try {
    const out = await writeMessage({
      channel,
      language,
      tone,
      me: { name: me?.name ?? user.name, businessName: me?.businessName ?? null, offer: me?.offer ?? null },
      lead: {
        title: lead.title,
        category: lead.category,
        address: lead.address,
        website: lead.website,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        problems: lead.website ? issueList(lead.auditIssues).map((i) => ISSUE_INFO[i].pitch) : [],
        tech: lead.tech,
      },
    });
    return NextResponse.json(out);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "The AI writer failed.", 502);
  }
}
