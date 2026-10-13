import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";
import { whatsappNumber } from "@/lib/utils";
import { waSendTemplate, waSendText, windowOpen } from "@/lib/whatsapp";

/**
 * POST { contact | leadId, text } — free-form reply (only within 24h of their last message)
 * POST { contact | leadId, template: { name, language, params } } — approved template (opted-in contacts)
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const acc = await db.waAccount.findUnique({ where: { userId: user.wsId } });
  if (!acc) return fail("Connect WhatsApp first.", 404);
  const b = await req.json().catch(() => ({}));

  let lead = b?.leadId ? await db.lead.findFirst({ where: { id: String(b.leadId), userId: user.wsId } }) : null;
  const contact = (String(b?.contact ?? "") || whatsappNumber(lead?.phone) || "").replace(/\D/g, "");
  if (!contact) return fail("No WhatsApp number.");
  if (!lead) {
    const last = await db.waMessage.findFirst({ where: { userId: user.wsId, contact, leadId: { not: null } }, select: { leadId: true } });
    if (last?.leadId) lead = await db.lead.findUnique({ where: { id: last.leadId } });
  }

  try {
    let waId: string | null;
    let body: string;
    let kind: string;
    if (b?.template?.name) {
      if (!lead?.optIn && !(await windowOpen(user.wsId, contact))) {
        return fail("Templates can only go to people who agreed to hear from you. Mark this lead as opted in first.", 403);
      }
      const params: string[] = Array.isArray(b.template.params) ? b.template.params.map(String) : [];
      waId = await waSendTemplate(acc, contact, String(b.template.name), String(b.template.language ?? "en"), params);
      body = `[${b.template.name}] ${params.join(" | ")}`;
      kind = "template";
    } else {
      const text = String(b?.text ?? "").trim();
      if (!text) return fail("Write a message.");
      if (!(await windowOpen(user.wsId, contact))) {
        return fail("It's been more than 24 hours since their last message. WhatsApp only allows an approved template now.", 403);
      }
      waId = await waSendText(acc, contact, text.slice(0, 4000));
      body = text;
      kind = "text";
    }
    const msg = await db.waMessage.create({
      data: { userId: user.wsId, leadId: lead?.id ?? null, contact, direction: "OUT", kind, body, waId, sentById: user.id },
    });
    if (lead) await logActivity(user.id, lead.id, "MESSAGE", `WhatsApp (official): ${body}`);
    return NextResponse.json({ message: msg });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Couldn't send.", 502);
  }
}
