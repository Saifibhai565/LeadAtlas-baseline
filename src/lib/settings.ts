import "server-only";
import { db } from "./db";

/** Platform settings the admin can change from the admin panel. */
export const SETTING_DEFAULTS = {
  payment_instructions:
    "JazzCash: 0300 0000000 (Account title: Your Name)\nEasypaisa: 0300 0000000\nBank: Meezan Bank, IBAN PK00 MEZN 0000 0000 0000 0000\n\nAfter paying, enter the transaction ID below. Your plan is switched on after we confirm the payment, usually within a few hours.",
  support_whatsapp: "",
  privacy_policy:
    "This is a placeholder. Replace it in Admin > Settings with a privacy policy written for your business, ideally reviewed by a lawyer.\n\nWhat we collect: your name, email and payment references, and the business information you save in the app.\n\nWhy: to run your account and the features you use.\n\nWho we share it with: service providers that run the app (hosting, and the AI service when you use AI features). We don't sell your data.\n\nYour choices: ask us to export or delete your account at any time through the support contact.",
  terms_of_service:
    "This is a placeholder. Replace it in Admin > Settings with terms written for your business, ideally reviewed by a lawyer.\n\nYou may use the service to find and contact businesses for legitimate purposes. You may not use it to send spam, harass anyone, or break any law or the terms of the websites you use it on.\n\nPlans are paid monthly in advance and switch on after payment is confirmed. Credits are not refundable.\n\nWe may suspend accounts that misuse the service.",
  signup_credits: process.env.SIGNUP_CREDITS ?? "500",
  referral_credits: "300",
  pool_enabled: "1",
  pool_days: "90",
  lead_price: "5",
  lead_price_currency: "USD",
  min_deposit: "20",
  deposit_note: "After sending, enter the exact amount and the transaction hash (or bank reference). Your wallet is credited once we confirm it.",
  support_ai: "1",
  support_bot_name: "Assistant",
  support_greeting: "Hi! Ask me anything about using the app. If I can't help, I'll pass you to our team.",
  support_kb: "Write here what the assistant should know: prices, payment methods, refund rules, how long approvals take, common problems and their fixes.",
  platform_name: process.env.NEXT_PUBLIC_APP_NAME || "LeadAtlas",
  platform_color: "",
  platform_tagline: "Lead generation for agencies",
  platform_logo: "",
  platform_favicon: "",
  seo_title: "",
  seo_description: "Find local businesses on Google Maps, check their websites, and reach out with WhatsApp, email and AI. Lead generation for agencies and freelancers.",
  seo_keywords: "lead generation, google maps leads, local business leads, agency tools, website audit",
  og_image: "",
  landing_cta: "Start free",
  landing_footer: "",
  landing_show_pricing: "1",
  landing_steps: "Search a city | Type what you sell to and where. Businesses arrive within minutes, with phone, address, rating and website.\nSee who needs you | Every website is checked and every lead gets a score and signals.\nReach out and follow up | Ready-written WhatsApp and email messages, a pipeline board and reminders.",
  landing_features: "Google Maps search across any city, with live results\nEmails, social pages and extra numbers from each business website\nWebsite and SEO audits, lead score and lead signals\nAI messages, website demos and proposals\nWhatsApp, SMS and email campaigns\nRank tracker, review tools and client websites\nTeam seats, API and Chrome extension",
  landing_faq: "Will my WhatsApp number get banned? | Messages open in your own WhatsApp and you press send yourself. There's no bulk blasting.\nWhat is a credit? | One new lead saved to your account. Duplicates are free.\nHow do I pay? | Bank, mobile wallets, dollars or crypto. Enter the transaction ID and your plan switches on once it's confirmed.",
  hero_title: "Find the businesses that need what you sell.",
  hero_subtitle: "Search Google Maps in any city, check every business's website, and know who to call first, with a message ready to send.",
  invoice_from: "Your business name\nAddress line\nCity, Country\nNTN / Tax number (if any)",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export async function getSettings() {
  const rows = await db.appSetting.findMany();
  const out: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out as Record<SettingKey, string>;
}

export async function setSetting(key: SettingKey, value: string) {
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export const DEFAULT_PLANS = [
  { name: "Starter", price: 2999, credits: 3000, seats: 1, ai: false, sort: 1, blurb: "For freelancers getting their first clients." },
  { name: "Pro", price: 7999, credits: 12000, seats: 3, ai: true, outreach: true, sort: 2, blurb: "AI writer and web extractor, for a small team." },
  { name: "Agency", price: 19999, credits: 40000, seats: 10, ai: true, api: true, outreach: true, whiteLabel: true, sort: 3, blurb: "API, webhooks and Chrome extension, for agencies prospecting every day." },
];

/** Creates the default plans the first time anyone looks at pricing. */
export async function ensurePlans() {
  if ((await db.plan.count()) === 0) await db.plan.createMany({ data: DEFAULT_PLANS });
  return db.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
}

/** Settings without the big image data (for forms and pages that only need to know if an image is set). */
export async function getLightSettings() {
  const s = await getSettings();
  const out: Record<string, string> = { ...s };
  for (const k of ["platform_logo", "platform_favicon", "og_image"]) out[k] = s[k as SettingKey] ? "set" : "";
  return out as Record<SettingKey, string>;
}
