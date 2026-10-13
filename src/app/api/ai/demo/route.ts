import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { aiBudget, callClaude } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { sanitizeHtml } from "@/lib/sanitize";
import { whatsappNumber } from "@/lib/utils";

export const maxDuration = 120;

const SYSTEM = `You design a one-page demo website for a local business, to show the owner what their site could look like.
Return ONLY a complete HTML document (<!doctype html> ... </html>) with all CSS in one <style> tag.
Rules:
- No JavaScript, no external fonts, images, scripts or stylesheets. Use system fonts, CSS gradients and simple CSS shapes instead of photos.
- Mobile-first, modern and clean, with a colour palette that suits the type of business.
- Sections: hero (business name, one-line promise, Call and WhatsApp buttons), about, 3 services, what customers say, location and contact, footer.
- Use only facts given for name, phone, address, rating and reviews. Quote at most 3 short real review excerpts (under 25 words each) with the reviewer's first name only.
- Services and the about text may be typical for this kind of business, but keep them generic and plausible. Never invent prices, awards or years in business.
- Add a small line in the footer: "Demo design".`;

/** POST { leadId } — makes (or remakes) a demo homepage and returns its public link. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const lead = await db.lead.findFirst({ where: { id: String(b?.leadId ?? ""), userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);

  let reviews: { n: string; r: number; t: string }[] = [];
  try {
    reviews = lead.reviews ? JSON.parse(lead.reviews) : [];
  } catch {
    reviews = [];
  }
  const good = reviews.filter((r) => r.r >= 4 && r.t).slice(0, 6);
  const wa = whatsappNumber(lead.phone);
  const facts = [
    `Name: ${lead.title}`,
    lead.category && `Type of business: ${lead.category}`,
    lead.address && `Address: ${lead.address}`,
    lead.phone && `Phone: ${lead.phone} (call link tel:${lead.phone.replace(/[^\d+]/g, "")})`,
    wa && `WhatsApp link: https://wa.me/${wa}`,
    lead.rating != null && `Google rating ${lead.rating} from ${lead.reviewCount ?? 0} reviews`,
    lead.description && `Their own description: ${lead.description}`,
    lead.latitude != null && `Map link: https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`,
    good.length && `Reviews:\n${good.map((r) => `- ${r.n.split(" ")[0]}: ${r.t.slice(0, 300)}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    aiBudget(user.wsId, 3);
    let html = await callClaude(SYSTEM, facts, 7000);
    html = html.replace(/^```(?:html)?/i, "").replace(/```$/, "").trim();
    if (!/<html[\s>]/i.test(html)) throw new Error("The demo didn't come out right. Try again.");
    const token = lead.demoToken ?? randomBytes(12).toString("base64url");
    await db.lead.update({
      where: { id: lead.id },
      data: { demoHtml: sanitizeHtml(html).slice(0, 200_000), demoToken: token, demoAt: new Date(), demoViewedAt: null },
    });
    return NextResponse.json({ path: `/d/${token}` });
  } catch (err) {
    if (err instanceof Error && !("status" in err)) return fail(err.message, 502);
    return aiFail(err);
  }
}
