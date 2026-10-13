import "server-only";
import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * Polite page fetcher: identifies itself, respects robots.txt, times out,
 * and never downloads more than a couple of MB.
 */
export const USER_AGENT = `Mozilla/5.0 (compatible; ${process.env.NEXT_PUBLIC_APP_NAME || "LeadAtlas"}Bot/1.0)`;
const BOT_TOKEN = (process.env.NEXT_PUBLIC_APP_NAME || "LeadAtlas").toLowerCase() + "bot";
const MAX_BYTES = 2_000_000;

export type Page = { url: string; status: number; html: string; ms: number };

export function normalizeUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw.trim()}`);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    // Public sites have a dot in their name. This also blocks Docker service names like "engine" or "app".
    if (!h.includes(".") || h.endsWith(".local") || h.endsWith(".internal") || h === "localhost") return null;
    if (isIP(h.replace(/^\[|\]$/g, "")) && isPrivateIp(h.replace(/^\[|\]$/g, ""))) return null;
    return u;
  } catch {
    return null;
  }
}

/** True for loopback, private, link-local, carrier-grade NAT, multicast and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const x = ip.toLowerCase();
  return x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("ff");
}

/** Throws if the host name points at a private or internal address. */
export async function assertPublicHost(hostname: string) {
  const h = hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(h) ? [{ address: h }] : await dns.lookup(h, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("That address points to a private network.");
  }
}

// ---------- robots.txt ----------
const robotsCache = new Map<string, { rules: string[]; at: number }>();

function parseRobots(txt: string): string[] {
  // Collect Disallow rules for "*" and for our own bot name.
  const disallow: string[] = [];
  let applies = false;
  let sawAgentLine = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!sawAgentLine) applies = false;
      sawAgentLine = true;
      const ua = val.toLowerCase();
      if (ua === "*" || ua === BOT_TOKEN) applies = true;
    } else {
      sawAgentLine = false;
      if (applies && key === "disallow" && val) disallow.push(val);
    }
  }
  return disallow;
}

export async function allowedByRobots(url: URL): Promise<boolean> {
  const origin = url.origin;
  let entry = robotsCache.get(origin);
  if (!entry || Date.now() - entry.at > 6 * 3600_000) {
    let rules: string[] = [];
    try {
      const res = await timedFetch(`${origin}/robots.txt`, 6000);
      if (res.ok) rules = parseRobots((await res.text()).slice(0, 200_000));
    } catch {
      /* no robots.txt reachable: treat as allowed */
    }
    entry = { rules, at: Date.now() };
    robotsCache.set(origin, entry);
  }
  const path = url.pathname + url.search;
  return !entry.rules.some((rule) => {
    const prefix = rule.replace(/\*.*$/, "").replace(/\$$/, "");
    return prefix !== "" && path.startsWith(prefix);
  });
}

/** Fetch that only talks to public addresses, including after every redirect. */
async function timedFetch(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = new URL(url);
    for (let hop = 0; hop < 6; hop++) {
      await assertPublicHost(current.hostname);
      const res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        const next = normalizeUrl(new URL(location, current).toString());
        if (!next) throw new Error("Redirected to a blocked address.");
        current = next;
        continue;
      }
      Object.defineProperty(res, "finalUrl", { value: current.toString() });
      return res as Response & { finalUrl: string };
    }
    throw new Error("Too many redirects.");
  } finally {
    clearTimeout(t);
  }
}

/** Fetches one HTML page. Returns null if robots.txt disallows it. Throws on network errors. */
export async function fetchPage(url: URL, timeoutMs = 12000): Promise<Page | null> {
  if (!(await allowedByRobots(url))) return null;
  const started = Date.now();
  const res = await timedFetch(url.toString(), timeoutMs);
  const type = res.headers.get("content-type") ?? "";
  let html = "";
  if (type.includes("html") || type === "") {
    const reader = res.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (size < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        size += value.length;
      }
      reader.cancel().catch(() => undefined);
      html = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
    }
  }
  return { url: res.finalUrl || url.toString(), status: res.status, html, ms: Date.now() - started };
}

/** Very small HTML → text conversion for AI extraction. */
export function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi, " [link: $1] ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
