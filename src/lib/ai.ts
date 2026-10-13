import "server-only";
import { allow } from "./ratelimit";

export const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

export type ExtractedBusiness = {
  name: string;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
};

const SYSTEM = `You extract business listings from web page text.
Return ONLY a JSON array, no prose, no code fences. Each item:
{"name": string, "category": string|null, "phone": string|null, "email": string|null, "website": string|null, "address": string|null, "city": string|null}
Rules:
- Only include businesses, shops, clinics, companies or organisations that are actually listed on the page.
- Copy contact details exactly as they appear. Never invent or guess a value; use null when it isn't on the page.
- Skip private individuals' personal contact details unless they are clearly a business listing.
- If nothing matches, return [].`;

export async function extractBusinesses(pageText: string, pageUrl: string, instructions: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Add ANTHROPIC_API_KEY to your .env file to use the web extractor.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 8000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Page URL: ${pageUrl}\n${instructions ? `What to look for: ${instructions}\n` : ""}\nPage text:\n${pageText}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`The AI service returned ${res.status}. ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).map((c) => c.text ?? "").join("").trim();
  const json = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = json.indexOf("[");
  const end = json.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(json.slice(start, end + 1)) as ExtractedBusiness[];
    return arr.filter((b) => b && typeof b.name === "string" && b.name.trim());
  } catch {
    throw new Error("The AI reply couldn't be read. Try again, or try a simpler page.");
  }
}

// ---------- message writer ----------
export type WriterInput = {
  channel: "WHATSAPP" | "EMAIL";
  language: "english" | "urdu" | "roman_urdu";
  tone: "friendly" | "professional" | "short";
  me: { name: string; businessName: string | null; offer: string | null };
  lead: {
    title: string;
    category: string | null;
    address: string | null;
    website: string | null;
    rating: number | null;
    reviewCount: number | null;
    problems: string[];
    tech: string | null;
  };
};

const LANG: Record<WriterInput["language"], string> = {
  english: "English",
  urdu: "Urdu in Urdu script",
  roman_urdu: "Roman Urdu (Urdu written in English letters, the way people text in Pakistan)",
};

export async function writeMessage(input: WriterInput): Promise<{ subject: string | null; body: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Add ANTHROPIC_API_KEY to your .env file to use the AI writer.");

  const facts = [
    `Business: ${input.lead.title}`,
    input.lead.category && `Category: ${input.lead.category}`,
    input.lead.address && `Address: ${input.lead.address}`,
    input.lead.rating != null && `Google rating: ${input.lead.rating} from ${input.lead.reviewCount ?? 0} reviews`,
    input.lead.website ? `Website: ${input.lead.website}` : "They have no website.",
    input.lead.problems.length && `Website problems found: ${input.lead.problems.join("; ")}`,
    input.lead.tech && `Website built with: ${input.lead.tech}`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `You write first-contact sales messages for a small business owner.
Write in ${LANG[input.language]}. Tone: ${input.tone}.
Channel: ${input.channel === "WHATSAPP" ? "WhatsApp message, 40 to 90 words, no subject, at most one emoji, no links" : "email, 80 to 150 words, with a short subject line"}.
Rules:
- Mention one specific, true detail about their business from the facts. Never invent facts, numbers or results.
- Connect that detail to what the sender offers, then ask one easy question. No pressure, no fake urgency.
- Sound like a real person, not a template. No "I hope this message finds you well".
Reply ONLY with JSON: {"subject": string|null, "body": string}`;

  const user = `Sender: ${input.me.name}${input.me.businessName ? `, ${input.me.businessName}` : ""}
What the sender offers: ${input.me.offer || "digital services for local businesses (websites, social media, online marketing)"}

Facts about the recipient:
${facts}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`The AI service returned ${res.status}.`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = (data.content ?? []).map((c) => c.text ?? "").join("").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { subject?: string | null; body?: string };
    if (!parsed.body) throw new Error();
    return { subject: input.channel === "EMAIL" ? parsed.subject ?? null : null, body: parsed.body.trim() };
  } catch {
    return { subject: null, body: text };
  }
}


// ---------- shared helpers (Phase 8) ----------

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

/** Daily AI budget per workspace, so one account can't run up a huge bill. */
export function aiBudget(wsId: string, cost = 1) {
  const limit = Number(process.env.AI_DAILY_LIMIT) || 400;
  for (let i = 0; i < cost; i++) {
    if (!allow(`ai:${wsId}`, limit, 24 * 3600_000)) {
      throw new AiError(`You've reached today's AI limit (${limit} actions). It resets within 24 hours.`, 429);
    }
  }
}

export async function callClaude(system: string, user: string, maxTokens = 1200): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("Add ANTHROPIC_API_KEY to your .env file to use AI features.", 503);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AiError(`The AI service returned ${res.status}. Try again in a moment.`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    return (data.content ?? []).map((c) => c.text ?? "").join("").trim();
  } catch (err) {
    if (err instanceof AiError) throw err;
    throw new AiError("The AI service didn't answer in time. Try again.");
  } finally {
    clearTimeout(t);
  }
}

/** Pulls the first JSON object or array out of a model reply. */
export function parseJson<T>(text: string): T {
  const clean = text.replace(/```(?:json)?/gi, "").trim();
  const starts = [clean.indexOf("{"), clean.indexOf("[")].filter((i) => i >= 0);
  if (starts.length === 0) throw new AiError("The AI reply couldn't be read. Try again.");
  const start = Math.min(...starts);
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  try {
    return JSON.parse(clean.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("The AI reply couldn't be read. Try again.");
  }
}

export type LeadFacts = {
  title: string;
  category: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  auditIssues: string | null;
  auditScore: number | null;
  tech: string | null;
  siteTitle: string | null;
  socials: string | null;
  phone: string | null;
  emails: string | null;
};

export function describeLead(l: LeadFacts, problems: string[]) {
  let socials: string[] = [];
  try {
    socials = l.socials ? Object.keys(JSON.parse(l.socials)) : [];
  } catch {
    socials = [];
  }
  return [
    `Business: ${l.title}`,
    l.category && `Category: ${l.category}`,
    l.address && `Address: ${l.address}`,
    l.rating != null && `Google rating ${l.rating} from ${l.reviewCount ?? 0} reviews`,
    l.website ? `Website: ${l.website}${l.siteTitle ? ` (title: "${l.siteTitle}")` : ""}` : "No website",
    l.auditScore != null && `Website score ${l.auditScore}/100`,
    problems.length && `Website problems: ${problems.join("; ")}`,
    l.tech && `Website built with: ${l.tech}`,
    socials.length ? `Social pages: ${socials.join(", ")}` : "No social pages found",
    `Reachable by: ${[l.phone && "phone/WhatsApp", l.emails && "email"].filter(Boolean).join(", ") || "unknown"}`,
  ]
    .filter(Boolean)
    .join("\n");
}
