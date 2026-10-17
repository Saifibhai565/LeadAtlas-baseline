import "server-only";
import { db } from "./db";
import { logActivity } from "./leads";
import { storeTags, parseTags } from "./tags";

/**
 * Runs the workspace's automations when a lead reaches a stage.
 * Actions: tag, followup (days), assign (member), note, sequence (enroll in an email sequence).
 * Safe to call after any status change; does nothing if no automations match.
 */
export async function runAutomations(wsId: string, actorId: string, leadId: string, newStatus: string) {
  const list = await db.automation.findMany({ where: { userId: wsId, active: true, trigger: `status:${newStatus}` } });
  if (list.length === 0) return;
  const lead = await db.lead.findFirst({ where: { id: leadId, userId: wsId } });
  if (!lead) return;

  for (const a of list) {
    try {
      if (a.action === "tag") {
        const next = Array.from(new Set([...parseTags(lead.tags), a.value.toLowerCase().trim()]));
        await db.lead.update({ where: { id: leadId }, data: { tags: storeTags(next) } });
      } else if (a.action === "followup") {
        const days = Math.max(0, Math.min(90, Number(a.value) || 3));
        const d = new Date(Date.now() + days * 86400_000);
        d.setHours(9, 0, 0, 0);
        await db.lead.update({ where: { id: leadId }, data: { followUpAt: d } });
      } else if (a.action === "assign") {
        const member = await db.user.findFirst({ where: { id: a.value, ownerId: wsId } });
        if (member) await db.lead.update({ where: { id: leadId }, data: { assignedToId: member.id } });
      } else if (a.action === "note") {
        await logActivity(actorId, leadId, "NOTE", a.value.slice(0, 500));
      } else if (a.action === "sequence") {
        const seq = await db.sequence.findFirst({ where: { id: a.value, userId: wsId, active: true } });
        const email = (lead.emails ?? "").split(",").map((e) => e.trim()).find((e) => e.includes("@"));
        const mailbox = await db.mailbox.findFirst({ where: { userId: wsId, active: true, platform: false } });
        if (seq && email && mailbox) {
          const exists = await db.sequenceEnrollment.findFirst({ where: { sequenceId: seq.id, leadId } });
          const suppressed = await db.suppression.findFirst({ where: { userId: wsId, email } });
          if (!exists && !suppressed) {
            await db.sequenceEnrollment.create({ data: { userId: wsId, sequenceId: seq.id, leadId, mailboxId: mailbox.id, nextAt: new Date() } });
          }
        }
      }
      await db.automation.update({ where: { id: a.id }, data: { runs: { increment: 1 } } });
    } catch {
      /* one automation failing must not stop the others */
    }
  }
  await logActivity(actorId, leadId, "NOTE", `Automation ran for “${newStatus.toLowerCase()}”.`).catch(() => undefined);
}
