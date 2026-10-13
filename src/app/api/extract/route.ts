import { NextResponse } from "next/server";
import { AI_ENABLED, extractBusinesses } from "@/lib/ai";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { scoreLead } from "@/lib/score";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { fetchPage, htmlToText, normalizeUrl } from "@/lib/web";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  return NextResponse.json({ enabled: AI_ENABLED && user.canUseAI, configured: AI_ENABLED, allowed: user.canUseAI });
}

const clean = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s.toLowerCase() !== "null" ? s.slice(0, 300) : null;
};

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!AI_ENABLED) return fail("The web extractor needs ANTHROPIC_API_KEY in your .env file.", 503);
  if (!user.canUseAI) return fail("AI features are part of the Pro and Agency plans. Upgrade on the Billing page.", 402);
  if (user.credits <= 0) return fail("You're out of credits.", 402);

  const body = await req.json().catch(() => null);
  const url = normalizeUrl(String(body?.url ?? ""));
  const instructions = String(body?.instructions ?? "").slice(0, 500);
  const fallbackCategory = clean(body?.category);
  const autoCheck = Boolean(body?.autoCheck);
  if (!url) return fail("Enter a full public web address, like https://example.com/directory.");

  let page;
  try {
    page = await fetchPage(url, 20000);
  } catch {
    return fail("That page couldn't be opened. Check the address and try again.", 502);
  }
  if (!page) return fail("This website asks automated tools not to read that page (robots.txt), so it was skipped.", 403);
  if (page.status >= 400) return fail(`That page answered with an error (${page.status}).`, 502);

  const text = htmlToText(page.html).slice(0, 60_000);
  if (text.length < 50) {
    return fail("That page has almost no readable text. It may load its content with JavaScript, which the extractor can't read yet.");
  }

  let found;
  try {
    found = await extractBusinesses(text, page.url, instructions);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Extraction failed.", 502);
  }

  const leads = found.slice(0, 300).map((b) => {
    const name = clean(b.name)!;
    const phone = clean(b.phone);
    const address = [clean(b.address), clean(b.city)].filter(Boolean).join(", ") || null;
    const email = clean(b.email);
    return {
      placeKey: `web|${name.toLowerCase()}|${(phone ?? address ?? "").toLowerCase()}`,
      title: name,
      category: clean(b.category) ?? fallbackCategory,
      phone,
      emails: email && email.includes("@") ? email.toLowerCase() : null,
      website: clean(b.website),
      address,
      source: "WEB",
      sourceUrl: page.url,
    };
  });

  const existing = await db.lead.findMany({
    where: { userId: user.wsId, placeKey: { in: leads.map((l) => l.placeKey) } },
    select: { placeKey: true },
  });
  const known = new Set(existing.map((l) => l.placeKey));
  const seen = new Set<string>();
  let fresh = leads.filter((l) => !known.has(l.placeKey) && !seen.has(l.placeKey) && seen.add(l.placeKey));
  fresh = fresh.slice(0, Math.max(0, user.credits));

  await db.$transaction([
    db.lead.createMany({
      data: fresh.map((l) => ({
        ...l,
        userId: user.wsId,
        enrichStatus: autoCheck && l.website ? "QUEUED" : "NONE",
        score: scoreLead(l),
      })),
    }),
    db.user.update({ where: { id: user.wsId }, data: { credits: { decrement: fresh.length } } }),
  ]);
  if (autoCheck) kickEnrichment();

  return NextResponse.json({
    found: leads.length,
    saved: fresh.length,
    sample: leads.slice(0, 50),
    pageUrl: page.url,
  });
}
