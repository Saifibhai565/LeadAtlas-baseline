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

/** Finds the link to the next page of a directory (rel=next, or a link whose text is "next" / ">" / a page number after the current). */
function nextPageUrl(html: string, base: string): URL | null {
  const rel = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i)?.[1];
  const candidates: string[] = [];
  if (rel) candidates.push(rel);
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,40}?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (/^(next|next page|older|more|\u203a|\u00bb|>)$/.test(text) || /[?&](page|p|pg|start|offset)=/.test(m[1])) candidates.push(m[1]);
  }
  for (const c of candidates) {
    try {
      const u = new URL(c, base);
      if (u.hostname === new URL(base).hostname) return u;
    } catch {
      /* skip */
    }
  }
  return null;
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
  const maxPages = Math.min(10, Math.max(1, Math.round(Number(body?.pages) || 1)));
  if (!url) return fail("Enter a full public web address, like https://example.com/directory.");

  // Directory mode: read the page, then follow "next page" links up to maxPages
  const found: Awaited<ReturnType<typeof extractBusinesses>> = [];
  const seenUrls = new Set<string>();
  let current: URL | null = url;
  let firstPage: Awaited<ReturnType<typeof fetchPage>> = null;
  for (let i = 0; i < maxPages && current; i++) {
    if (seenUrls.has(current.toString())) break;
    seenUrls.add(current.toString());
    let page;
    try {
      page = await fetchPage(current, 20000);
    } catch {
      break;
    }
    if (!page || page.status >= 400) {
      if (i === 0) return fail("That page couldn't be opened. Check the address and try again.", 502);
      break;
    }
    if (i === 0) firstPage = page;
    const text = htmlToText(page.html).slice(0, 60_000);
    if (text.length < 50) {
      if (i === 0) return fail("That page has almost no readable text. It may load its content with JavaScript, which the extractor can't read yet.");
      break;
    }
    try {
      const batch = await extractBusinesses(text, page.url, instructions);
      for (const b of batch) found.push(b);
    } catch (err) {
      if (i === 0) return fail(err instanceof Error ? err.message : "Extraction failed.", 502);
      break;
    }
    if (found.length >= 300) break;
    // find a "next page" link
    current = maxPages > 1 ? nextPageUrl(page.html, page.url) : null;
    if (current) await new Promise((r) => setTimeout(r, 800)); // be polite between pages
  }
  if (found.length === 0) return fail("No businesses were found on that page.");
  const page = firstPage!;

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
