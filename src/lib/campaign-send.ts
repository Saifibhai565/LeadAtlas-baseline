import "server-only";
import { db } from "./db";
import { logActivity } from "./leads";
import { sendSms } from "./sms";
import { renderTemplate } from "./template";
import { whatsappNumber } from "./utils";
import { waSendTemplate } from "./whatsapp";

/** Sends the next few messages of automatic campaigns (opted-in leads only, official channels). */
export async function processApiCampaigns() {
  const campaigns = await db.campaign.findMany({ where: { status: "ACTIVE", channel: { in: ["WHATSAPP_API", "SMS_API"] } }, take: 20 });
  for (const c of campaigns) {
    const items = await db.campaignItem.findMany({
      where: { campaignId: c.id, status: "PENDING" },
      orderBy: { position: "asc" },
      take: 5,
      include: { lead: true },
    });
    if (items.length === 0) {
      await db.campaign.update({ where: { id: c.id }, data: { status: "DONE" } });
      continue;
    }
    const owner = await db.user.findUnique({
      where: { id: c.userId },
      select: { name: true, businessName: true, signature: true, smsUrl: true, smsMethod: true, smsBody: true, waAccount: true },
    });
    if (!owner) continue;
    const me = { name: owner.name, businessName: owner.businessName, signature: owner.signature };
    const cfg = c.apiConfig ? (JSON.parse(c.apiConfig) as { name: string; language: string; params: string[] }) : null;

    for (const it of items) {
      if (!it.lead.optIn) {
        await db.campaignItem.update({ where: { id: it.id }, data: { status: "SKIPPED" } });
        continue;
      }
      const to = whatsappNumber(it.phone) ?? it.phone.replace(/[^\d]/g, "");
      try {
        if (c.channel === "WHATSAPP_API") {
          if (!owner.waAccount || !cfg) throw new Error("WhatsApp isn't connected.");
          const params = cfg.params.map((p) => renderTemplate(p, it.lead, me));
          const waId = await waSendTemplate(owner.waAccount, to, cfg.name, cfg.language, params);
          await db.waMessage.create({
            data: { userId: c.userId, leadId: it.leadId, contact: to, direction: "OUT", kind: "template", body: `[${cfg.name}] ${params.join(" | ")}`, waId },
          });
        } else {
          await sendSms(owner, it.phone, it.message);
          await db.smsMessage.create({ data: { userId: c.userId, leadId: it.leadId, toNumber: it.phone, body: it.message, status: "SENT", sentAt: new Date() } });
        }
        await db.campaignItem.update({ where: { id: it.id }, data: { status: "SENT", sentAt: new Date() } });
        await logActivity(c.userId, it.leadId, "MESSAGE", `${c.channel === "SMS_API" ? "SMS" : "WhatsApp template"} (${c.name}): ${it.message}`);
      } catch (err) {
        await db.campaignItem.update({ where: { id: it.id }, data: { status: "SKIPPED", message: `${it.message}\n\n[Not sent: ${(err instanceof Error ? err.message : "error").slice(0, 200)}]` } });
      }
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}
