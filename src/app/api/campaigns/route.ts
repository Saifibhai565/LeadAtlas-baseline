import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { renderTemplate } from "@/lib/template";
import { leadWhere } from "../leads/query";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const list = await db.campaign.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" } });
  const withCounts = await Promise.all(
    list.map(async (c) => {
      const groups = await db.campaignItem.groupBy({ by: ["status"], where: { campaignId: c.id }, _count: { _all: true } });
      const counts = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
      return { ...c, templates: JSON.parse(c.templates) as string[], counts };
    }),
  );
  return NextResponse.json({ campaigns: withCounts });
}

/**
 * POST { name, channel: "WHATSAPP" | "SMS", templates: string[], query }
 * Builds the list of people to message (leads with a phone that match the filters), best leads first.
 * Each message is sent by a person from their own phone; nothing is sent automatically.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim().slice(0, 80);
  const channel = ["SMS", "WHATSAPP_API", "SMS_API"].includes(b?.channel) ? String(b.channel) : "WHATSAPP";
  const automatic = channel.endsWith("_API");
  let templates: string[] = (Array.isArray(b?.templates) ? b.templates : [])
    .map((t: unknown) => String(t ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);
  let apiConfig: string | null = null;
  if (channel === "WHATSAPP_API") {
    const t = b?.waTemplate;
    if (!t?.name) return fail("Choose an approved WhatsApp template.");
    if (!(await db.waAccount.findUnique({ where: { userId: user.wsId } }))) return fail("Connect WhatsApp Business first (Inbox page).");
    const params = Array.isArray(t.params) ? t.params.map((p: unknown) => String(p ?? "")).slice(0, 10) : [];
    apiConfig = JSON.stringify({ name: String(t.name), language: String(t.language ?? "en"), params });
    templates = [`Template ${t.name}${params.length ? ` (${params.join(", ")})` : ""}`];
  }
  if (channel === "SMS_API" && !(await db.user.findUnique({ where: { id: user.wsId }, select: { smsUrl: true } }))?.smsUrl) {
    return fail("Set up an SMS provider in Settings first.");
  }
  const query = String(b?.query ?? "").slice(0, 4000);
  if (!name) return fail("Name the campaign.");
  if (templates.length === 0) return fail("Add at least one message.");

  const params = new URLSearchParams(query);
  params.set("phone", "1");
  if (automatic) params.set("optIn", "1"); // automatic sending only to people who agreed
  const leads = await db.lead.findMany({
    where: leadWhere(user.wsId, params, user.id),
    orderBy: [{ score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 2000,
  });
  if (leads.length === 0) {
    return fail(automatic ? "No opted-in leads with a phone number match these filters." : "No leads with a phone number match these filters.");
  }

  const me = await db.user.findUnique({ where: { id: user.id }, select: { name: true, businessName: true, signature: true } });
  const sender = { name: me?.name ?? user.name, businessName: me?.businessName, signature: me?.signature };

  const campaign = await db.campaign.create({
    data: { userId: user.wsId, name, channel, templates: JSON.stringify(templates), query, apiConfig },
  });
  await db.campaignItem.createMany({
    data: leads.map((l, i) => {
      const t = i % templates.length; // rotate messages so you can see which one gets more replies
      return { campaignId: campaign.id, leadId: l.id, phone: l.phone!, templateIndex: t, message: renderTemplate(templates[t], l, sender), position: i };
    }),
  });
  return NextResponse.json({ campaign: { id: campaign.id }, people: leads.length }, { status: 201 });
}
