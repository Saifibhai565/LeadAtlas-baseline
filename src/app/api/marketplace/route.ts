import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

const SEED = [
  { name: "Website pitch (no website)", category: "Web design", channel: "WHATSAPP", language: "roman_urdu", body: "Assalam o Alaikum! Maine {{name}} ko Google Maps par dekha. Aap ke customers aksar pehle online dekhte hain, lekin aap ki website nahi mili. Main local businesses ke liye asaan, mobile-friendly websites banata hoon. Ek chhota demo bhejun?" },
  { name: "Website pitch (weak website)", category: "Web design", channel: "WHATSAPP", language: "roman_urdu", body: "Hello {{name}}! Aap ki website dekhi. Mobile par thori slow aur purane design ki lag rahi hai, jis se customers wapas chale jate hain. Main ise naya aur tez bana sakta hoon. Aap ki site ka ek behtar version dikhaun?" },
  { name: "Google reviews help", category: "Reviews", channel: "WHATSAPP", language: "roman_urdu", body: "Hi {{name}}! Google par aap ke reviews achhe hain lekin thore kam hain. Zyada reviews se naye customers bharosa karte hain. Main ek asaan tareeqa (review link + QR) de sakta hoon jis se customers ek click mein review karein. Baat karein?" },
  { name: "SEO / Google Maps ranking", category: "SEO", channel: "WHATSAPP", language: "roman_urdu", body: "Assalam o Alaikum {{name}}! Jab log {{city}} mein aap ki tarah ka business dhoondte hain, kya aap upar aate hain? Main local SEO karta hoon taake aap Google Maps par top par aayein. Aap ki abhi ki ranking ki ek free report bhejun?" },
  { name: "Follow-up (no reply)", category: "General", channel: "WHATSAPP", language: "roman_urdu", body: "Hi {{name}}, pichle message ke baare mein sirf yaad-dihani. Agar abhi munasib waqt nahi to koi baat nahi. Jab bhi apni online presence behtar karna chahein, main yahan hoon." },
  { name: "Cold email (website)", category: "Web design", channel: "EMAIL", language: "english", subject: "A quick idea for {{name}}", body: "Hi,\n\nI came across {{name}} and noticed your website could do more to turn visitors into customers. I build fast, modern sites for local businesses.\n\nWould you like me to send a free demo of how yours could look?\n\nBest regards" },
];

async function seedOfficial() {
  const count = await db.marketTemplate.count();
  if (count > 0) return;
  for (const t of SEED) {
    await db.marketTemplate.create({ data: { ...t, authorName: "Team", official: true, approved: true } }).catch(() => undefined);
  }
}

export async function GET(req: Request) {
  await seedOfficial();
  const user = await apiUser();
  if (!user) return unauthorized();
  const p = new URL(req.url).searchParams;
  const where: Record<string, unknown> = { approved: true };
  if (p.get("channel")) where.channel = p.get("channel");
  if (p.get("category")) where.category = p.get("category");
  if (p.get("language")) where.language = p.get("language");
  const q = p.get("q")?.trim();
  if (q) Object.assign(where, { OR: [{ name: { contains: q } }, { body: { contains: q } }] });
  const templates = await db.marketTemplate.findMany({
    where,
    orderBy: [{ official: "desc" }, { uses: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: { id: true, authorName: true, official: true, name: true, category: true, channel: true, language: true, subject: true, body: true, uses: true },
  });
  const categories = Array.from(new Set(templates.map((t) => t.category)));
  return NextResponse.json({ templates, categories });
}

/** POST { templateId } or { name, channel, body, subject } — submit a template for approval. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));

  // Submit one of your own saved templates to the marketplace
  if (b?.templateId) {
    const t = await db.template.findFirst({ where: { id: String(b.templateId), userId: user.wsId } });
    if (!t) return fail("Template not found.", 404);
    await db.marketTemplate.create({
      data: {
        authorId: user.wsId,
        authorName: user.name.split(" ")[0],
        name: t.name,
        category: String(b?.category ?? "General").slice(0, 40),
        channel: t.channel,
        language: String(b?.language ?? "english"),
        subject: t.subject,
        body: t.body,
      },
    });
    return NextResponse.json({ ok: true, pending: true }, { status: 201 });
  }
  return fail("Nothing to submit.");
}
