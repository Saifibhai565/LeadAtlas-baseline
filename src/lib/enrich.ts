import "server-only";
import { promises as dns } from "node:dns";
import { db } from "./db";
import { recomputeLeadSignals } from "./signals-server";
import { refreshInstagram } from "./instagram";
import { cleanEmails } from "./lead-details";
import { fetchPage, normalizeUrl, type Page } from "./web";

// ---------- extraction ----------
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const BAD_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|@(example|sentry|wixpress|domain|email)\.|^(name|your|user)@/i;

const SOCIAL_PATTERNS: [keyof Socials, RegExp][] = [
  ["facebook", /https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)[^"'\s<>?#]+/i],
  ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore)[^"'\s<>?#]+/i],
  ["linkedin", /https?:\/\/(?:[a-z]{2}\.|www\.)?linkedin\.com\/(?:company|in)\/[^"'\s<>?#]+/i],
  ["x", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home)[A-Za-z0-9_]{1,15}(?=["'\/\s?#<])/i],
  ["youtube", /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[^"'\s<>?#]+/i],
  ["tiktok", /https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\s<>?#]+/i],
  ["pinterest", /https?:\/\/(?:[a-z]{2}\.|www\.)?pinterest\.[a-z.]+\/(?!pin\/)[A-Za-z0-9_]+\/?(?=["'\s?#<])/i],
  ["telegram", /https?:\/\/(?:t\.me|telegram\.me)\/[A-Za-z0-9_]{4,}/i],
  ["snapchat", /https?:\/\/(?:www\.)?snapchat\.com\/add\/[A-Za-z0-9._-]+/i],
  ["threads", /https?:\/\/(?:www\.)?threads\.net\/@[A-Za-z0-9._]+/i],
];

const TECH: [string, RegExp][] = [
  ["WordPress", /wp-content|wp-includes/i],
  ["WooCommerce", /woocommerce/i],
  ["Elementor", /elementor/i],
  ["Shopify", /cdn\.shopify\.com|shopify\.theme/i],
  ["Wix", /static\.wixstatic\.com|wix\.com\/website/i],
  ["Squarespace", /squarespace\.com|static1\.squarespace/i],
  ["Webflow", /webflow\.(com|io)|data-wf-page/i],
  ["Joomla", /\/media\/jui\/|joomla/i],
  ["Drupal", /drupal-settings-json|\/sites\/default\/files/i],
  ["Next.js", /\/_next\/static/i],
  ["Laravel", /laravel_session|csrf-token.*laravel/i],
  ["Google Analytics", /googletagmanager\.com\/gtag|google-analytics\.com/i],
  ["Google Tag Manager", /googletagmanager\.com\/gtm\.js/i],
  ["Facebook Pixel", /connect\.facebook\.net\/[^"']*fbevents|fbq\(/i],
  ["Google Ads", /googleadservices\.com|gtag\(['"]config['"],\s*['"]AW-|google_conversion_id/i],
  ["WhatsApp widget", /wa\.me\/|api\.whatsapp\.com\/send/i],
  ["Online booking", /calendly\.com|booksy|fresha\.com|setmore/i],
];

export type Socials = Partial<
  Record<"facebook" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok" | "whatsapp" | "pinterest" | "telegram" | "snapchat" | "threads", string>
>;

function findEmails(html: string) {
  const found = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of html.match(EMAIL_RE) ?? []) found.add(m.toLowerCase());
  return cleanEmails(Array.from(found).filter((e) => !BAD_EMAIL.test(e)));
}

function findPhones(html: string) {
  const found = new Set<string>();
  for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const p = decodeURIComponent(m[1]).replace(/[^\d+]/g, "");
    if (p.replace(/\D/g, "").length >= 8) found.add(p);
  }
  return Array.from(found);
}

function findSocials(html: string): Socials {
  const out: Socials = {};
  for (const [key, re] of SOCIAL_PATTERNS) {
    const m = html.match(re);
    if (m) out[key] = m[0].replace(/\/+$/, "");
  }
  const wa = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{8,15})/i);
  if (wa) out.whatsapp = wa[1].replace(/\D/g, "");
  return out;
}

function findTech(html: string) {
  return TECH.filter(([, re]) => re.test(html)).map(([name]) => name);
}

function contactLinks(page: Page): URL[] {
  const base = new URL(page.url);
  const out = new Map<string, URL>();
  for (const m of page.html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi)) {
    const href = m[1];
    const label = (m[2] + " " + href).toLowerCase();
    if (!/contact|about|reach|location|رابطہ|ہمارے/.test(label)) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      if (/\.(pdf|jpg|png|zip)$/i.test(u.pathname)) continue;
      out.set(u.pathname, u);
    } catch {
      /* ignore bad links */
    }
    if (out.size >= 2) break;
  }
  return Array.from(out.values());
}

function findBuiltBy(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = text.match(/(?:designed|developed|website|powered|made)\s+(?:and\s+\w+\s+)?by\s*:?\s*([A-Z][\w&.\- ]{1,40}?)(?:\s*[|©.,]|\s{2}|$)/i);
  const name = m?.[1]?.trim();
  if (!name || /wordpress|wix|shopify|squarespace|google|elementor|theme/i.test(name)) return null;
  return name.slice(0, 60);
}

function findOwner(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const role = text.match(/(?:CEO|Founder|Co-founder|Owner|Proprietor|Managing Director|Chief Executive)\s*[:,\-–]?\s*((?:Dr\.?\s+)?[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/);
  if (role) return role[1].slice(0, 60);
  const dr = text.match(/\b(Dr\.?\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  return dr ? dr[1].slice(0, 60) : null;
}

async function hasSitemap(url: string) {
  try {
    const p = await fetchPage(new URL("/sitemap.xml", url), 6000);
    return Boolean(p && p.status < 400);
  } catch {
    return false;
  }
}

/** Domain expiry from the public RDAP registry (not every country's domains support it). */
async function domainExpiry(website: string) {
  try {
    const hostName = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
    const parts = hostName.split(".");
    const domain = parts.slice(-2).join(".").length > 6 || parts.length < 3 ? parts.slice(-2).join(".") : parts.slice(-3).join(".");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: controller.signal, headers: { Accept: "application/rdap+json" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    const exp = j.events?.find((e) => e.eventAction === "expiration")?.eventDate;
    return exp ? new Date(exp) : null;
  } catch {
    return null;
  }
}

// ---------- SEO and online-store checks ----------
type SeoCheck = { key: string; ok: boolean; label: string; tip: string };

function seoAudit(html: string, hasSitemap: boolean) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? "";
  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = imgs.filter((i) => !/\balt=["'][^"']+["']/i.test(i)).length;
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const checks: SeoCheck[] = [
    { key: "title", ok: title.length >= 15 && title.length <= 65, label: "Page title 15-65 characters", tip: title ? `Title is ${title.length} characters.` : "No title." },
    { key: "desc", ok: desc.length >= 70 && desc.length <= 170, label: "Meta description 70-170 characters", tip: desc ? `Description is ${desc.length} characters.` : "No description for Google to show." },
    { key: "h1", ok: h1 === 1, label: "Exactly one main heading (H1)", tip: `${h1} H1 headings found.` },
    { key: "alt", ok: imgs.length === 0 || noAlt / imgs.length <= 0.2, label: "Images have alt text", tip: `${noAlt} of ${imgs.length} images have no alt text.` },
    { key: "schema", ok: /application\/ld\+json[\s\S]{0,2000}?(LocalBusiness|Organization|Restaurant|Store|MedicalBusiness|Dentist)/i.test(html), label: "Business schema markup", tip: "No LocalBusiness schema, so Google understands less about the business." },
    { key: "canonical", ok: /<link[^>]+rel=["']canonical["']/i.test(html), label: "Canonical link", tip: "No canonical link." },
    { key: "og", ok: /<meta[^>]+property=["']og:title["']/i.test(html), label: "Social share preview (Open Graph)", tip: "Links shared on WhatsApp or Facebook show no proper preview." },
    { key: "sitemap", ok: hasSitemap, label: "Sitemap", tip: "No sitemap.xml for search engines." },
    { key: "content", ok: words >= 250, label: "Enough text on the homepage", tip: `Only about ${words} words. Thin pages rank poorly.` },
  ];
  return { score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100), checks };
}

function storeAudit(html: string, tech: string[], https: boolean, mobile: boolean, ms: number) {
  const h = html.toLowerCase();
  const platform = tech.includes("Shopify") ? "Shopify" : tech.includes("WooCommerce") ? "WooCommerce" : /add to cart|add-to-cart|\/cart|checkout/.test(h) ? "Online store" : null;
  if (!platform) return null;
  const checks: SeoCheck[] = [
    { key: "wa", ok: /wa\.me\/|api\.whatsapp\.com|whatsapp/.test(h), label: "WhatsApp order/chat button", tip: "No WhatsApp button. Most Pakistani shoppers want to ask before buying." },
    { key: "cod", ok: /cash on delivery|\bcod\b/.test(h), label: "Cash on delivery mentioned", tip: "COD isn't mentioned on the homepage. It's the most trusted way to pay." },
    { key: "pay", ok: /jazzcash|easypaisa|visa|mastercard|bank transfer/.test(h), label: "Payment methods shown", tip: "No payment methods shown." },
    { key: "reviews", ok: /judge\.me|loox|stamped|yotpo|customer reviews|testimonials|★/.test(h), label: "Customer reviews on the store", tip: "No reviews or testimonials. Social proof lifts sales." },
    { key: "delivery", ok: /free (delivery|shipping)|delivery charges|shipping/.test(h), label: "Delivery information", tip: "No delivery or shipping information." },
    { key: "returns", ok: /return|refund|exchange/.test(h), label: "Return or exchange policy", tip: "No return/exchange policy link. Buyers hesitate without it." },
    { key: "pixel", ok: tech.includes("Facebook Pixel"), label: "Facebook Pixel for ads", tip: "No Facebook Pixel, so ads can't be measured or retargeted." },
    { key: "analytics", ok: tech.includes("Google Analytics") || tech.includes("Google Tag Manager"), label: "Analytics installed", tip: "No analytics. They can't see where sales come from." },
    { key: "secure", ok: https, label: "Secure (https)", tip: "The store isn't secure. Browsers warn shoppers." },
    { key: "mobile", ok: mobile, label: "Mobile-friendly", tip: "Not built for phones." },
    { key: "fast", ok: ms < 3000, label: "Loads in under 3 seconds", tip: `Took ${(ms / 1000).toFixed(1)} s. Slow stores lose buyers.` },
  ];
  return { platform, score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100), checks };
}

// ---------- audit ----------
function audit(home: Page) {
  const issues: string[] = [];
  let score = 100;
  if (!home.url.startsWith("https://")) {
    issues.push("NO_HTTPS");
    score -= 25;
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(home.html)) {
    issues.push("NOT_MOBILE");
    score -= 25;
  }
  if (home.ms > 6000) {
    issues.push("SLOW");
    score -= 25;
  } else if (home.ms > 3000) {
    issues.push("SLOW");
    score -= 15;
  }
  const title = home.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || null;
  if (!title) {
    issues.push("NO_TITLE");
    score -= 10;
  }
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{10,}/i.test(home.html)) {
    issues.push("NO_DESCRIPTION");
    score -= 10;
  }
  return { score: Math.max(0, score), issues, title: title?.slice(0, 200) ?? null };
}

// ---------- email domain check ----------
const mxCache = new Map<string, "VALID" | "INVALID" | "UNKNOWN">();

export async function emailDomainStatus(email: string): Promise<"VALID" | "INVALID" | "UNKNOWN"> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "INVALID";
  const cached = mxCache.get(domain);
  if (cached) return cached;
  let result: "VALID" | "INVALID" | "UNKNOWN";
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ]);
    result = mx.length > 0 ? "VALID" : "INVALID";
  } catch (err) {
    const code = (err as { code?: string }).code;
    result = code === "ENOTFOUND" || code === "ENODATA" ? "INVALID" : "UNKNOWN";
  }
  mxCache.set(domain, result);
  return result;
}

// ---------- one lead ----------
async function checkLead(leadId: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const existingEmails = (lead.emails ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const url = lead.website ? normalizeUrl(lead.website) : null;

  if (!url) {
    // No website: we can still check the email domain
    const emailStatus = existingEmails[0] ? await emailDomainStatus(existingEmails[0]) : null;
    await db.lead.update({
      where: { id: leadId },
      data: { enrichStatus: "DONE", enrichedAt: new Date(), emailStatus },
    });
    return;
  }

  let home: Page | null = null;
  try {
    home = await fetchPage(url);
  } catch {
    home = null;
  }

  if (!home || home.status >= 400 || !home.html) {
    const emailStatus = existingEmails[0] ? await emailDomainStatus(existingEmails[0]) : null;
    await db.lead.update({
      where: { id: leadId },
      data: {
        enrichStatus: "DONE",
        enrichedAt: new Date(),
        emailStatus,
        auditScore: 0,
        auditIssues: home === null ? "SITE_DOWN" : `SITE_DOWN`,
      },
    });
    return;
  }

  const pages: Page[] = [home];
  for (const link of contactLinks(home)) {
    try {
      const p = await fetchPage(link, 8000);
      if (p && p.status < 400) pages.push(p);
    } catch {
      /* skip */
    }
  }
  const all = pages.map((p) => p.html).join("\n");

  const emails = Array.from(new Set([...existingEmails, ...findEmails(all)])).slice(0, 6);
  const phones = findPhones(all).slice(0, 4);
  const socials = findSocials(all);
  const tech = findTech(home.html);
  const a = audit(home);
  const emailStatus = emails[0] ? await emailDomainStatus(emails[0]) : null;

  await db.lead.update({
    where: { id: leadId },
    data: {
      enrichStatus: "DONE",
      enrichedAt: new Date(),
      emails: emails.length ? emails.join(", ") : null,
      emailStatus,
      extraPhones: phones.length ? phones.join(", ") : null,
      socials: Object.keys(socials).length ? JSON.stringify(socials) : null,
      tech: tech.length ? tech.join(", ") : null,
      auditScore: a.score,
      auditIssues: a.issues.length ? a.issues.join(",") : null,
      siteLoadMs: home.ms,
      siteTitle: a.title,
      builtBy: findBuiltBy(home.html),
      seo: JSON.stringify(seoAudit(home.html, await hasSitemap(home.url))),
      ecom: (() => {
        const st = storeAudit(all, tech, home.url.startsWith("https://"), /<meta[^>]+name=["']viewport["']/i.test(home.html), home.ms);
        return st ? JSON.stringify(st) : null;
      })(),
      ownerName: findOwner(all),
      domainExpiresAt: await domainExpiry(lead.website!),
    },
  });
}

// ---------- background worker ----------
type WorkerState = { running: boolean; active: number };
const g = globalThis as unknown as { __enrichWorker?: WorkerState };

/** Starts the in-process worker if it isn't running. Safe to call often. */
export function kickEnrichment() {
  if (!g.__enrichWorker) g.__enrichWorker = { running: false, active: 0 };
  const state = g.__enrichWorker;
  if (state.running) return;
  state.running = true;
  const concurrency = Math.min(10, Math.max(1, Number(process.env.ENRICH_CONCURRENCY) || 4));

  const worker = async () => {
    while (true) {
      const next = await db.lead.findFirst({ where: { enrichStatus: "QUEUED" }, orderBy: { updatedAt: "asc" }, select: { id: true } });
      if (!next) return;
      const claimed = await db.lead.updateMany({
        where: { id: next.id, enrichStatus: "QUEUED" },
        data: { enrichStatus: "RUNNING" },
      });
      if (claimed.count === 0) continue;
      try {
        await checkLead(next.id);
        await refreshInstagram(next.id).catch(() => undefined);
        await recomputeLeadSignals(next.id);
      } catch {
        await db.lead.update({ where: { id: next.id }, data: { enrichStatus: "FAILED", enrichedAt: new Date() } }).catch(() => undefined);
      }
    }
  };

  // Leads left RUNNING by a restart go back in the queue.
  db.lead
    .updateMany({ where: { enrichStatus: "RUNNING" }, data: { enrichStatus: "QUEUED" } })
    .catch(() => undefined)
    .then(() => Promise.all(Array.from({ length: concurrency }, worker)))
    .finally(() => {
      state.running = false;
    });
}
