import { NextResponse } from "next/server";
import { aiBudget, writeMessage } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const maxDuration = 300;

/** POST { ids, channel, language, tone } — writes a personal first message for up to 25 leads. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;

  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String).slice(0, 25) : [];
  if (ids.length === 0) return fail("Select up to 25 leads.");
  const channel = b?.channel === "EMAIL" ? "EMAIL" : "WHATSAPP";
  const language = ["english", "urdu", "roman_urdu"].includes(b?.language) ? b.language : "roman_urdu";
  const tone = ["friendly", "professional", "short"].includes(b?.tone) ? b.tone : "friendly";

  const [leads, me] = await Promise.all([
    db.lead.findMany({ where: { id: { in: ids }, userId: user.wsId } }),
    db.user.findUnique({ where: { id: user.id }, select: { name: true, businessName: true, offer: true } }),
  ]);
  try {
    aiBudget(user.wsId, leads.length);
  } catch (err) {
    return aiFail(err);
  }

  let done = 0;
  let failed = 0;
  const queue = [...leads];
  const worker = async () => {
    for (let l = queue.shift(); l; l = queue.shift()) {
      try {
        const out = await writeMessage({
          channel,
          language,
          tone,
          me: { name: me?.name ?? user.name, businessName: me?.businessName ?? null, offer: me?.offer ?? null },
          lead: {
            title: l.title,
            category: l.category,
            address: l.address,
            website: l.website,
            rating: l.rating,
            reviewCount: l.reviewCount,
            problems: l.website ? issueList(l.auditIssues).map((i) => ISSUE_INFO[i].pitch) : [],
            tech: l.tech,
          },
        });
        const text = out.subject ? `${out.subject}\n\n${out.body}` : out.body;
        await db.lead.update({ where: { id: l.id }, data: { aiMessage: text } });
        done++;
      } catch {
        failed++;
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return NextResponse.json({ done, failed });
}
