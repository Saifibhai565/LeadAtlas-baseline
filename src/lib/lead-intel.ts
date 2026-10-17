import "server-only";
import { promises as dns } from "node:dns";
import net from "node:net";
import tls from "node:tls";
import { db } from "./db";
import { assertPublicHost, fetchPage, htmlToText } from "./web";

/**
 * Deep check of a lead. Free checks run automatically after a website check;
 * paid sources (traffic, company data, email verification) only when the person asks.
 * API keys are set by the Super Admin (AppSetting "intel_keys").
 */
export type Intel = {
  domainCreated?: string | null;
  domainAgeYears?: number | null;
  sslExpires?: string | null;
  sslDaysLeft?: number | null;
  ip?: string | null;
  language?: string | null;
  contactForm?: boolean;
  booking?: boolean;
  liveChat?: boolean;
  whatsappWidget?: boolean;
  careersUrl?: string | null;
  contactUrl?: string | null;
  psiMobile?: number | null;
  psiDesktop?: number | null;
  psiLcp?: string | null;
  unsafe?: string | null; // Safe Browsing threat type
  reviewsLast90?: number | null;
  reviewsPrev90?: number | null;
  ownerEmails?: { email: string; status: "valid" | "invalid" | "catch-all" | "unknown" }[];
  ownerEmailNote?: string | null;
  traffic?: { visits: number; month: string } | null;
  company?: { employees?: number | null; revenue?: string | null; industry?: string | null; founded?: number | null; linkedin?: string | null } | null;
  emailChecks?: Record<string, string>;
  phoneType?: { number: string; type: string; carrier?: string; country?: string; valid: boolean } | null;
};

export type IntelKeys = { psi?: string; safebrowsing?: string; similarweb?: string; apollo?: string; zerobounce?: string; numverify?: string };

export async function getIntelKeys(): Promise<IntelKeys> {
  const row = await db.appSetting.findUnique({ where: { key: "intel_keys" } });
  try {
    return row ? (JSON.parse(row.value) as IntelKeys) : {};
  } catch {
    return {};
  }
}

const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);

function hostOf(website: string) {
  return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "").toLowerCase();
}
function rootDomain(host: string) {
  const p = host.split(".");
  const sld = p.slice(-2).join(".");
  return p.length >= 3 && /^(com|net|org|edu|gov|co|ac)\.[a-z]{2}$/.test(sld) ? p.slice(-3).join(".") : sld;
}

async function rdapCreated(domain: string) {
  try {
    const res = await timeout(fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { headers: { Accept: "application/rdap+json" } }), 8000);
    if (!res.ok) return null;
    const j = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    return j.events?.find((e) => e.eventAction === "registration")?.eventDate ?? null;
  } catch {
    return null;
  }
}

function sslExpiry(host: string): Promise<string | null> {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 8000, rejectUnauthorized: false }, () => {
      const c = s.getPeerCertificate();
      s.end();
      resolve(c?.valid_to ? new Date(c.valid_to).toISOString() : null);
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => {
      s.destroy();
      resolve(null);
    });
  });
}

async function pageSpeed(url: string, key?: string) {
  const run = async (strategy: "mobile" | "desktop") => {
    const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance${key ? `&key=${key}` : ""}`;
    const res = await timeout(fetch(u), 60000);
    if (!res.ok) return null;
    const j = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } }; audits?: Record<string, { displayValue?: string }> } };
    return { score: Math.round((j.lighthouseResult?.categories?.performance?.score ?? 0) * 100), lcp: j.lighthouseResult?.audits?.["largest-contentful-paint"]?.displayValue ?? null };
  };
  try {
    const [m, d] = await Promise.all([run("mobile"), run("desktop")]);
    return { psiMobile: m?.score ?? null, psiDesktop: d?.score ?? null, psiLcp: m?.lcp ?? null };
  } catch {
    return {};
  }
}

async function safeBrowsing(url: string, key?: string) {
  if (!key) return undefined;
  try {
    const res = await timeout(
      fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "leadatlas", clientVersion: "1.0" },
          threatInfo: { threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"], platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"], threatEntries: [{ url }] },
        }),
      }),
      10000,
    );
    const j = (await res.json()) as { matches?: { threatType: string }[] };
    return j.matches?.[0]?.threatType ?? null;
  } catch {
    return undefined;
  }
}

function monthsAgo(w: string) {
  const s = w.toLowerCase();
  const n = Number(s.match(/\d+/)?.[0] ?? (/\b(a|an)\b/.test(s) ? 1 : NaN));
  if (!Number.isFinite(n)) return null;
  if (s.includes("year")) return n * 12;
  if (s.includes("month")) return n;
  if (s.includes("week")) return n / 4;
  return 0;
}

/** How dependable the contact details are, 0-100. */
export function contactQuality(l: { phone: string | null; emails: string | null; emailStatus: string | null; website: string | null; auditIssues: string | null; enrichStatus: string | null }, intel: Intel) {
  let q = 0;
  const digits = (l.phone ?? "").replace(/\D/g, "");
  if (digits.length >= 9) q += /^(92)?0?3\d{9}$/.test(digits) || /^923\d{9}$/.test(digits) ? 30 : 22;
  if (l.emails) q += l.emailStatus === "VALID" ? 25 : l.emailStatus === "INVALID" ? 0 : 12;
  if (intel.ownerEmails?.some((e) => e.status === "valid")) q += 10;
  if (l.website) q += (l.auditIssues ?? "").includes("SITE_DOWN") ? 0 : 15;
  if (intel.contactForm) q += 5;
  if (intel.unsafe) q -= 20;
  if (l.enrichStatus === "DONE") q += 10;
  if (intel.reviewsLast90 && intel.reviewsLast90 > 0) q += 5;
  return Math.max(0, Math.min(100, q));
}

/** Free checks for one lead: domain, SSL, page signals, speed, safety, review trend, quality. */
export async function runFreeIntel(leadId: string, opts: { speed?: boolean } = { speed: true }) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  const keys = await getIntelKeys();
  let intel: Intel = {};
  try {
    intel = lead.intel ? JSON.parse(lead.intel) : {};
  } catch {
    intel = {};
  }

  // Reviews trend from the saved reviews
  try {
    const reviews = lead.reviews ? (JSON.parse(lead.reviews) as { w: string }[]) : [];
    const ages = reviews.map((r) => monthsAgo(r.w ?? "")).filter((x): x is number => x != null);
    intel.reviewsLast90 = ages.filter((a) => a <= 3).length;
    intel.reviewsPrev90 = ages.filter((a) => a > 3 && a <= 6).length;
  } catch {
    /* ignore */
  }

  if (lead.website && !(lead.auditIssues ?? "").includes("SITE_DOWN")) {
    try {
      const url = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
      const host = hostOf(url);
      await assertPublicHost(host);
      const domain = rootDomain(host);
      const [created, ssl, ips, page] = await Promise.all([
        rdapCreated(domain),
        url.startsWith("https") || true ? sslExpiry(host) : Promise.resolve(null),
        dns.lookup(host, { all: true }).catch(() => []),
        fetchPage(new URL(url), 15000).catch(() => null),
      ]);
      intel.domainCreated = created;
      intel.domainAgeYears = created ? Math.round(((Date.now() - new Date(created).getTime()) / (365.25 * 86400_000)) * 10) / 10 : null;
      intel.sslExpires = ssl;
      intel.sslDaysLeft = ssl ? Math.round((new Date(ssl).getTime() - Date.now()) / 86400_000) : null;
      intel.ip = (ips as { address: string }[])[0]?.address ?? null;
      if (page?.html) {
        const h = page.html;
        const low = h.toLowerCase();
        intel.language = h.match(/<html[^>]*\blang=["']?([a-zA-Z-]{2,10})/i)?.[1] ?? null;
        intel.contactForm = /<form[\s\S]{0,3000}?(type=["']?email|name=["']?(email|message|phone))/i.test(h);
        intel.booking = /calendly|booksy|fresha|setmore|simplybook|appointment|book now|book an appointment/i.test(low);
        intel.liveChat = /tawk\.to|intercom|crisp\.chat|livechatinc|zopim|zendesk|tidio|drift\.com|messenger.*customer_chat/i.test(low);
        intel.whatsappWidget = /wa\.me\/|api\.whatsapp\.com\/send/i.test(low);
        const links = Array.from(h.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi)).map((m) => ({ href: m[1], text: htmlToText(m[2]).toLowerCase() }));
        const abs = (href: string) => {
          try {
            return new URL(href, page.url).toString();
          } catch {
            return null;
          }
        };
        const careers = links.find((x) => /careers?|jobs|vacanc|join (our|the) team|we.?re hiring/.test(`${x.text} ${x.href.toLowerCase()}`));
        intel.careersUrl = careers ? abs(careers.href) : null;
        const contact = links.find((x) => /contact/.test(`${x.text} ${x.href.toLowerCase()}`));
        intel.contactUrl = contact ? abs(contact.href) : null;
      }
      if (opts.speed !== false) Object.assign(intel, await pageSpeed(url, keys.psi));
      const sb = await safeBrowsing(url, keys.safebrowsing);
      if (sb !== undefined) intel.unsafe = sb;
    } catch {
      /* website unreachable or private: skip website checks */
    }
  }
  const quality = contactQuality(lead, intel);
  await db.lead.update({ where: { id: leadId }, data: { intel: JSON.stringify(intel), quality, intelAt: new Date() } });
  return intel;
}

// ---------- Owner email guess and check ----------

function smtpCheck(mx: string, from: string, to: string[]): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    const out: Record<string, number> = {};
    const sock = net.connect(25, mx);
    const lines = [`EHLO checker.local`, `MAIL FROM:<${from}>`, ...to.map((t) => `RCPT TO:<${t}>`), "QUIT"];
    let step = -1;
    let buf = "";
    const done = () => {
      sock.destroy();
      resolve(out);
    };
    sock.setTimeout(12000, done);
    sock.on("error", done);
    sock.on("data", (d) => {
      buf += d.toString();
      if (!/\r?\n$/.test(buf) || /^\d{3}-/m.test(buf.split(/\r?\n/).filter(Boolean).pop() ?? "")) return;
      const code = Number(buf.trim().split(/\r?\n/).pop()!.slice(0, 3));
      buf = "";
      if (step >= 2 && step < 2 + to.length) out[to[step - 2]] = code;
      step++;
      if (step >= lines.length) return done();
      sock.write(`${lines[step]}\r\n`);
    });
  });
}

/** Guesses the owner's email from their name and the website domain, then asks the mail server which addresses exist. */
export async function findOwnerEmail(leadId: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead?.website) throw new Error("This lead has no website, so there's no domain to check.");
  let intel: Intel = {};
  try {
    intel = lead.intel ? JSON.parse(lead.intel) : {};
  } catch {
    intel = {};
  }
  let ownerName = lead.ownerName;
  if (!ownerName && lead.details) {
    try {
      ownerName = (JSON.parse(lead.details) as { owner?: { name?: string } }).owner?.name ?? null;
    } catch {
      ownerName = null;
    }
  }
  const domain = rootDomain(hostOf(lead.website));
  const parts = (ownerName ?? "").replace(/^dr\.?\s+/i, "").toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const guesses = new Set<string>();
  if (parts.length) {
    const [f, l] = [parts[0], parts[parts.length - 1]];
    guesses.add(`${f}@${domain}`);
    if (l && l !== f) [`${f}.${l}`, `${f}${l}`, `${f[0]}${l}`, `${f}_${l}`, `${f[0]}.${l}`, `${l}@`.slice(0, -1)].forEach((x) => guesses.add(`${x}@${domain}`));
  }
  ["info", "contact", "hello", "admin", "owner", "sales"].forEach((x) => guesses.add(`${x}@${domain}`));
  const list = Array.from(guesses).slice(0, 12);

  const mx = await dns.resolveMx(domain).catch(() => []);
  if (!mx.length) {
    intel.ownerEmails = list.map((email) => ({ email, status: "invalid" as const }));
    intel.ownerEmailNote = "This domain can't receive email.";
  } else {
    const host = mx.sort((a, b) => a.priority - b.priority)[0].exchange;
    const fake = `zz${Date.now().toString(36)}nobody@${domain}`;
    const codes = await smtpCheck(host, `check@${process.env.APP_URL ? new URL(process.env.APP_URL).hostname : "example.com"}`, [fake, ...list]);
    if (Object.keys(codes).length === 0) {
      intel.ownerEmails = list.map((email) => ({ email, status: "unknown" as const }));
      intel.ownerEmailNote = "The mail server couldn't be reached (many internet providers block port 25). These are likely addresses, not checked.";
    } else if (codes[fake] >= 200 && codes[fake] < 300) {
      intel.ownerEmails = list.map((email) => ({ email, status: "catch-all" as const }));
      intel.ownerEmailNote = "This domain accepts every address, so we can't tell which one is real. The first ones are the most likely.";
    } else {
      intel.ownerEmails = list.map((email) => ({ email, status: codes[email] >= 200 && codes[email] < 300 ? ("valid" as const) : codes[email] >= 500 ? ("invalid" as const) : ("unknown" as const) }));
      intel.ownerEmailNote = intel.ownerEmails.some((e) => e.status === "valid") ? null : "No guess was confirmed by the mail server.";
    }
  }
  const quality = contactQuality(lead, intel);
  await db.lead.update({ where: { id: leadId }, data: { intel: JSON.stringify(intel), quality } });
  return intel;
}

// ---------- Paid sources (only when asked) ----------

export async function runPaidIntel(leadId: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found.");
  const keys = await getIntelKeys();
  if (!keys.similarweb && !keys.apollo && !keys.zerobounce && !keys.numverify) throw new Error("No paid data sources are connected. The Super Admin adds their keys in Super Admin > Integrations.");
  let intel: Intel = {};
  try {
    intel = lead.intel ? JSON.parse(lead.intel) : {};
  } catch {
    intel = {};
  }
  const domain = lead.website ? rootDomain(hostOf(lead.website)) : null;

  if (keys.similarweb && domain) {
    try {
      const end = new Date();
      end.setMonth(end.getMonth() - 1);
      const m = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
      const res = await timeout(
        fetch(`https://api.similarweb.com/v1/website/${domain}/total-traffic-and-engagement/visits?api_key=${keys.similarweb}&start_date=${m}&end_date=${m}&country=world&granularity=monthly&main_domain_only=false`),
        15000,
      );
      const j = (await res.json()) as { visits?: { date: string; visits: number }[] };
      const v = j.visits?.[0];
      intel.traffic = v ? { visits: Math.round(v.visits), month: m } : null;
    } catch {
      /* ignore */
    }
  }
  if (keys.apollo && domain) {
    try {
      const res = await timeout(
        fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, { headers: { "X-Api-Key": keys.apollo, "Cache-Control": "no-cache" } }),
        15000,
      );
      const j = (await res.json()) as { organization?: { estimated_num_employees?: number; annual_revenue_printed?: string; industry?: string; founded_year?: number; linkedin_url?: string } };
      const o = j.organization;
      intel.company = o ? { employees: o.estimated_num_employees ?? null, revenue: o.annual_revenue_printed ?? null, industry: o.industry ?? null, founded: o.founded_year ?? null, linkedin: o.linkedin_url ?? null } : null;
    } catch {
      /* ignore */
    }
  }
  if (keys.zerobounce) {
    const all = [...(lead.emails ?? "").split(","), ...(intel.ownerEmails ?? []).filter((e) => e.status !== "invalid").slice(0, 3).map((e) => e.email)]
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, 6);
    intel.emailChecks = intel.emailChecks ?? {};
    for (const e of all) {
      try {
        const res = await timeout(fetch(`https://api.zerobounce.net/v2/validate?api_key=${keys.zerobounce}&email=${encodeURIComponent(e)}`), 15000);
        const j = (await res.json()) as { status?: string };
        if (j.status) intel.emailChecks[e] = j.status;
      } catch {
        /* ignore */
      }
    }
  }
  if (keys.numverify && lead.phone) {
    try {
      const digits = lead.phone.replace(/[^\d+]/g, "");
      const res = await timeout(fetch(`https://apilayer.net/api/validate?access_key=${keys.numverify}&number=${encodeURIComponent(digits)}`), 15000);
      const j = (await res.json()) as { valid?: boolean; line_type?: string; carrier?: string; country_name?: string; international_format?: string };
      intel.phoneType = { number: j.international_format ?? digits, type: j.line_type ?? "unknown", carrier: j.carrier || undefined, country: j.country_name || undefined, valid: Boolean(j.valid) };
    } catch {
      /* ignore */
    }
  }
  const quality = contactQuality(lead, intel);
  await db.lead.update({ where: { id: leadId }, data: { intel: JSON.stringify(intel), quality, intelAt: new Date() } });
  return intel;
}

// ---------- Duplicates ----------

const normPhone = (p: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-10) : null;
};
const normHost = (w: string | null) => {
  if (!w) return null;
  try {
    const h = hostOf(w);
    return /facebook|instagram|wixsite|blogspot|linktr|google\./.test(h) ? null : h;
  } catch {
    return null;
  }
};

/** Finds the same business saved more than once (same phone or same website) and merges them into the oldest. */
export async function mergeDuplicates(wsId: string) {
  const leads = await db.lead.findMany({ where: { userId: wsId }, orderBy: { createdAt: "asc" }, take: 20000 });
  const keyOf = new Map<string, string>(); // phone/host -> keeper id
  const groups = new Map<string, string[]>(); // keeper -> duplicate ids
  for (const l of leads) {
    const keys = [normPhone(l.phone), normHost(l.website)].filter((k): k is string => Boolean(k));
    const keeper = keys.map((k) => keyOf.get(k)).find(Boolean);
    if (keeper && l.title.slice(0, 4).toLowerCase() === leads.find((x) => x.id === keeper)!.title.slice(0, 4).toLowerCase()) {
      groups.set(keeper, [...(groups.get(keeper) ?? []), l.id]);
    } else {
      for (const k of keys) if (!keyOf.has(k)) keyOf.set(k, l.id);
    }
  }
  let merged = 0;
  for (const [keeperId, dupIds] of groups) {
    const keeper = leads.find((l) => l.id === keeperId)!;
    const fill: Record<string, unknown> = {};
    for (const id of dupIds) {
      const d = leads.find((l) => l.id === id)!;
      for (const f of ["phone", "website", "emails", "socials", "address", "category", "rating", "reviewCount", "ownerName", "details", "latitude", "longitude", "mapsUrl"] as const) {
        if ((keeper[f] == null || keeper[f] === "") && d[f] != null && fill[f] == null) fill[f] = d[f];
      }
    }
    await db.$transaction([
      ...(Object.keys(fill).length ? [db.lead.update({ where: { id: keeperId }, data: fill })] : []),
      db.activity.updateMany({ where: { leadId: { in: dupIds } }, data: { leadId: keeperId } }),
      db.lead.deleteMany({ where: { id: { in: dupIds } } }),
    ]);
    merged += dupIds.length;
  }
  return merged;
}
