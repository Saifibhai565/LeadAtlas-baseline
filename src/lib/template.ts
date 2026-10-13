import { ISSUE_INFO, issueList } from "./issues";

export type TemplateLead = {
  title: string;
  category?: string | null;
  address?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  auditIssues?: string | null;
};

export type Me = { name: string; businessName?: string | null; signature?: string | null };

export const VARIABLES: { key: string; label: string }[] = [
  { key: "name", label: "Business name" },
  { key: "category", label: "Category" },
  { key: "city", label: "City or area" },
  { key: "website", label: "Their website" },
  { key: "rating", label: "Their rating" },
  { key: "reviews", label: "Number of reviews" },
  { key: "problem", label: "Their website's main problem" },
  { key: "my_name", label: "Your name" },
  { key: "my_business", label: "Your business" },
  { key: "signature", label: "Your signature" },
];

function city(address?: string | null) {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  // "Street, Area, Lahore, Pakistan" -> "Lahore"
  const cleaned = parts.filter((p) => !/^(pakistan|\d{4,6})$/i.test(p));
  return cleaned.length >= 2 ? cleaned[cleaned.length - 1].replace(/\s*\d{4,6}$/, "") : cleaned[0] ?? "";
}

export function renderTemplate(body: string, lead: TemplateLead, me: Me) {
  const issues = issueList(lead.auditIssues);
  const problem = !lead.website
    ? "you don't have a website yet"
    : issues[0]
      ? ISSUE_INFO[issues[0]].label.toLowerCase()
      : "";
  const values: Record<string, string> = {
    name: lead.title,
    category: (lead.category ?? "").toLowerCase(),
    city: city(lead.address),
    website: lead.website ?? "",
    rating: lead.rating != null ? lead.rating.toFixed(1) : "",
    reviews: lead.reviewCount != null ? String(lead.reviewCount) : "",
    problem,
    my_name: me.name,
    my_business: me.businessName ?? "",
    signature: me.signature ?? me.name,
  };
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, k: string) => values[k.toLowerCase()] ?? m);
}

export const STARTER_TEMPLATES = [
  {
    name: "No website (Roman Urdu)",
    channel: "WHATSAPP",
    subject: null,
    body:
      "Assalam o Alaikum! {{name}} ko Google Maps par dekha, {{rating}} rating ke saath mashallah achha kaam hai. " +
      "Lekin aapki koi website nazar nahi aayi. Main {{my_business}} se {{my_name}} hoon, hum {{category}} ke liye tez aur mobile-friendly websites banate hain. " +
      "Kya main aapko 2 minute mein ek sample dikha sakta hoon?",
  },
  {
    name: "Website problem (English)",
    channel: "WHATSAPP",
    subject: null,
    body:
      "Hi! I came across {{name}} on Google Maps. I noticed one thing on your website: {{problem}}. " +
      "That usually costs businesses customers who give up and call someone else. " +
      "I'm {{my_name}} from {{my_business}}, and fixing this is quick. Would you like me to send a short free review of your site?",
  },
  {
    name: "Intro email",
    channel: "EMAIL",
    subject: "A quick idea for {{name}}",
    body:
      "Hello {{name}} team,\n\nI found you on Google Maps while looking at {{category}} businesses in {{city}}. " +
      "You have {{reviews}} reviews, which says customers like you.\n\n" +
      "I help businesses like yours get more of those customers online. I'd be glad to share two or three specific ideas for you, no charge.\n\n" +
      "Would that be useful?\n\n{{signature}}",
  },
];
