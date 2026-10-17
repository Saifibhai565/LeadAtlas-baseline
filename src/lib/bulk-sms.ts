import "server-only";
import { db } from "./db";
import { notify } from "./notify";
import { sendSms } from "./sms";

/** Sends queued bulk SMS continuously (one workspace's provider at a time), spaced out. Runs in-process. */
const g = globalThis as unknown as { __bulksms?: { running: boolean } };

export function kickBulkSms() {
  if (!g.__bulksms) g.__bulksms = { running: false };
  if (g.__bulksms.running) return;
  g.__bulksms.running = true;
  loop()
    .catch((e) => console.error("Bulk SMS:", e))
    .finally(() => {
      g.__bulksms!.running = false;
    });
}

async function loop() {
  for (;;) {
    const batches = await db.smsBatch.findMany({ where: { status: "ACTIVE" } });
    if (batches.length === 0) return;
    let did = false;
    for (const b of batches) {
      const next = await db.smsMessage.findFirst({ where: { batchId: b.id, status: "QUEUED" }, orderBy: { createdAt: "asc" } });
      if (!next) {
        await db.smsBatch.update({ where: { id: b.id }, data: { status: "DONE" } });
        await notify(b.userId, `Bulk SMS “${b.name}” finished`, `All ${b.total} messages were processed.`, "/bulk-sms");
        continue;
      }
      const cfg = await db.user.findUnique({ where: { id: b.userId }, select: { smsUrl: true, smsMethod: true, smsBody: true } });
      if (!cfg?.smsUrl) {
        await db.smsBatch.update({ where: { id: b.id }, data: { status: "PAUSED" } });
        await notify(b.userId, `Bulk SMS “${b.name}” paused`, "No SMS provider is set up. Add one in Settings, then resume.", "/bulk-sms");
        continue;
      }
      const claimed = await db.smsMessage.updateMany({ where: { id: next.id, status: "QUEUED" }, data: { status: "SENT" } });
      if (claimed.count === 0) continue;
      did = true;
      try {
        await sendSms(cfg, next.toNumber, next.body);
        await db.smsMessage.update({ where: { id: next.id }, data: { sentAt: new Date(), error: null } });
      } catch (err) {
        await db.smsMessage.update({ where: { id: next.id }, data: { status: "FAILED", error: (err instanceof Error ? err.message : "Failed").slice(0, 300) } });
      }
      await new Promise((r) => setTimeout(r, 1500)); // polite gap
    }
    if (!did) await new Promise((r) => setTimeout(r, 1500));
  }
}
