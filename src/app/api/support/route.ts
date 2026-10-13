import { NextResponse } from "next/server";
import { AI_ENABLED, callClaude, parseJson } from "@/lib/ai";
import { db } from "@/lib/db";
import { emails } from "@/lib/emails";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { adminAlertEmail, appUrl, sendMailLater } from "@/lib/mail";
import { notify } from "@/lib/notify";
import { allow } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRODUCT_GUIDE = `Pages: Dashboard; Searches (Google Maps search, lead goal, find by product, OpenStreetMap); Watches (repeat searches weekly);
Leads (filters, tags, signals, map, export, import, bulk actions; click a name for the lead panel); Website checks; Web extractor; Rank tracker;
Pipeline (drag cards between stages); WhatsApp inbox; WhatsApp & SMS campaigns; Email outreach (mailboxes, sequences); Templates; Websites (publish demos);
Team (invite links); Billing (plans, pay by JazzCash/Easypaisa/bank with transaction ID, coupons, invoices, referral link); API and extension; Settings.
Credits: 1 credit per new lead saved. Searches need the scraping engine running. AI features need a plan with AI.`;

async function alertTeam(userName: string, email: string, ticketId: string, text: string) {
  const admins = await db.user.findMany({ where: { role: "ADMIN", blocked: false }, select: { id: true } });
  for (const a of admins) await notify(a.id, `Support request from ${userName}`, text.slice(0, 140), `/admin?tab=Support&ticket=${ticketId}`);
  const to = adminAlertEmail();
  if (to) {
    sendMailLater({
      ...emails.test(to),
      subject: `Support request from ${userName}`,
      text: `${userName} (${email}) needs help:\n\n${text}\n\nReply in Super Admin > Support: ${appUrl("/admin")}`,
      html: `<p><strong>${userName}</strong> (${email}) needs help:</p><p>${text.replace(/</g, "&lt;")}</p><p><a href="${appUrl("/admin")}">Reply in Super Admin &gt; Support</a></p>`,
    });
  }
}

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const s = await getSettings();
  const ticket = await db.supportTicket.findFirst({
    where: { userId: user.id, status: { not: "CLOSED" } },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
  });
  return NextResponse.json({
    ticket,
    bot: { name: s.support_bot_name, greeting: s.support_greeting, ai: s.support_ai === "1" && AI_ENABLED },
    whatsapp: (s.support_whatsapp ?? "").replace(/\D/g, "") || null,
  });
}

/** POST { message } — the person writes; the AI assistant answers, or the team is told. POST { human: true } asks for a person. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!allow(`support:${user.id}`, 30, 3600_000)) return fail("Too many messages. Please wait a little.", 429);
  const b = await req.json().catch(() => ({}));
  const s = await getSettings();
  let ticket = await db.supportTicket.findFirst({ where: { userId: user.id, status: { not: "CLOSED" } }, orderBy: { updatedAt: "desc" } });

  if (b?.human) {
    if (!ticket) return fail("Write your question first.");
    await db.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
    await db.supportMessage.create({ data: { ticketId: ticket.id, sender: "AI", body: "I've passed this to our team. They'll reply here, and you'll get a notification." } });
    const last = await db.supportMessage.findFirst({ where: { ticketId: ticket.id, sender: "USER" }, orderBy: { createdAt: "desc" } });
    await alertTeam(user.name, user.email, ticket.id, last?.body ?? "Asked to talk to a person");
    return NextResponse.json({ ok: true });
  }

  const message = String(b?.message ?? "").trim().slice(0, 2000);
  if (!message) return fail("Write a message.");
  const aiOn = s.support_ai === "1" && AI_ENABLED;
  if (!ticket) ticket = await db.supportTicket.create({ data: { userId: user.id, subject: message.slice(0, 80), status: aiOn ? "AI" : "OPEN" } });
  await db.supportMessage.create({ data: { ticketId: ticket.id, sender: "USER", body: message } });
  await db.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });

  if (ticket.status !== "AI" || !aiOn) {
    if (ticket.status !== "OPEN") await db.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
    await alertTeam(user.name, user.email, ticket.id, message);
    return NextResponse.json({ ok: true });
  }

  const history = await db.supportMessage.findMany({ where: { ticketId: ticket.id }, orderBy: { createdAt: "asc" }, take: 20 });
  try {
    const out = parseJson<{ answer: string; handoff: boolean }>(
      await callClaude(
        `You are "${s.support_bot_name}", the support assistant for ${s.platform_name}, a lead-finding app for agencies and freelancers.
Answer briefly and kindly in the same language the person writes in (English, Urdu or Roman Urdu). Use only the knowledge below; never invent prices, policies or features.
If you don't know, the question is about a payment, refund, account access, a bug, or the person is upset, set handoff to true.
Reply ONLY with JSON: {"answer": "...", "handoff": true|false}

Product guide:
${PRODUCT_GUIDE}

Company knowledge:
${s.support_kb}

About this person: plan ${user.planName}, ${user.credits} credits${user.isOwner ? "" : ", team member"}.`,
        history.map((m) => `${m.sender === "USER" ? "Customer" : m.sender === "TEAM" ? "Support team" : "Assistant"}: ${m.body}`).join("\n"),
        700,
      ),
    );
    await db.supportMessage.create({ data: { ticketId: ticket.id, sender: "AI", body: out.answer.slice(0, 3000) } });
    if (out.handoff) {
      await db.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
      await alertTeam(user.name, user.email, ticket.id, message);
    }
    return NextResponse.json({ ok: true, handoff: out.handoff });
  } catch {
    await db.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
    await db.supportMessage.create({ data: { ticketId: ticket.id, sender: "AI", body: "I couldn't answer that right now, so I've sent it to our team." } });
    await alertTeam(user.name, user.email, ticket.id, message);
    return NextResponse.json({ ok: true, handoff: true });
  }
}
