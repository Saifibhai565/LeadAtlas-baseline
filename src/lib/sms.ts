import "server-only";
import { db } from "./db";
import { assertPublicHost } from "./web";

export type SmsConfig = { smsUrl: string | null; smsMethod: string | null; smsBody: string | null };

/** Sends one SMS through the workspace's provider (any HTTP API, including Android gateway apps). */
export async function sendSms(cfg: SmsConfig, to: string, message: string) {
  if (!cfg.smsUrl) throw new Error("No SMS provider set up.");
  const fill = (t: string, enc: boolean) =>
    t.replace(/\{to\}/g, enc ? encodeURIComponent(to) : to).replace(/\{message\}/g, enc ? encodeURIComponent(message) : message.replace(/"/g, '\\"'));
  const url = fill(cfg.smsUrl, true);
  // On the server, never call private network addresses (keeps the internal services safe)
  if (process.env.NODE_ENV === "production") await assertPublicHost(new URL(url).hostname);
  const post = (cfg.smsMethod ?? "GET").toUpperCase() === "POST";
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: post ? "POST" : "GET",
      headers: post ? { "Content-Type": cfg.smsBody?.trim().startsWith("{") ? "application/json" : "application/x-www-form-urlencoded" } : undefined,
      body: post ? fill(cfg.smsBody ?? "", !cfg.smsBody?.trim().startsWith("{")) : undefined,
      signal: controller.signal,
    });
    const text = (await res.text().catch(() => "")).slice(0, 300);
    if (!res.ok) throw new Error(`Provider answered ${res.status}: ${text}`);
    return text;
  } finally {
    clearTimeout(t);
  }
}

/** Sends queued SMS, a few per run, spaced out. */
export async function processSms() {
  const queued = await db.smsMessage.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: 10 });
  for (const m of queued) {
    const cfg = await db.user.findUnique({ where: { id: m.userId }, select: { smsUrl: true, smsMethod: true, smsBody: true } });
    try {
      await sendSms(cfg ?? { smsUrl: null, smsMethod: null, smsBody: null }, m.toNumber, m.body);
      await db.smsMessage.update({ where: { id: m.id }, data: { status: "SENT", sentAt: new Date(), error: null } });
    } catch (err) {
      await db.smsMessage.update({ where: { id: m.id }, data: { status: "FAILED", error: (err instanceof Error ? err.message : "Failed").slice(0, 300) } });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
