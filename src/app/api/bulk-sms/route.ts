import { NextResponse } from "next/server";
import { kickBulkSms } from "@/lib/bulk-sms";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PHONE = /(\+?\d[\d\s().-]{7,}\d)/g;

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const [cfg, batches] = await Promise.all([
    db.user.findUnique({ where: { id: user.wsId }, select: { smsUrl: true } }),
    db.smsBatch.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const withCounts = await Promise.all(
    batches.map(async (b) => {
      const g = await db.smsMessage.groupBy({ by: ["status"], where: { batchId: b.id }, _count: { _all: true } });
      const c = Object.fromEntries(g.map((x) => [x.status, x._count._all])) as Record<string, number>;
      return { ...b, sent: c.SENT ?? 0, failed: c.FAILED ?? 0, queued: c.QUEUED ?? 0 };
    }),
  );
  if (batches.some((b) => b.status === "ACTIVE")) kickBulkSms();
  return NextResponse.json({ providerReady: Boolean(cfg?.smsUrl), batches: withCounts });
}

/** POST { name, body, list } — queues a bulk SMS send. {{name}} is filled per number when a name is given. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const cfg = await db.user.findUnique({ where: { id: user.wsId }, select: { smsUrl: true } });
  if (!cfg?.smsUrl) return fail("Set up an SMS provider in Settings first.", 503);
  const b = await req.json().catch(() => ({}));
  const body = String(b?.body ?? "").trim().slice(0, 1000);
  if (!body) return fail("Write the message.");

  // Parse "number" or "number, Name" lines
  const map = new Map<string, string>();
  for (const line of String(b?.list ?? "").split(/[\n;]+/)) {
    const m = line.match(PHONE);
    if (!m) continue;
    const num = m[0].replace(/[^\d+]/g, "");
    if (num.replace(/\D/g, "").length < 9) continue;
    const name = line.replace(m[0], "").replace(/[,<>"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!map.has(num)) map.set(num, name);
  }
  const rows = Array.from(map);
  if (rows.length === 0) return fail("Paste at least one phone number.");
  if (rows.length > 20000) return fail("Up to 20,000 numbers per send. Split the list.");

  const batch = await db.smsBatch.create({ data: { userId: user.wsId, name: String(b?.name ?? "").trim().slice(0, 80) || body.slice(0, 40), body, total: rows.length } });
  const fill = (name: string) => body.replace(/\{\{\s*name\s*\}\}/gi, name || "there").replace(/\{\{\s*first_name\s*\}\}/gi, (name || "there").split(" ")[0]);
  for (let i = 0; i < rows.length; i += 1000) {
    await db.smsMessage.createMany({ data: rows.slice(i, i + 1000).map(([num, name]) => ({ userId: user.wsId, batchId: batch.id, toNumber: num, body: fill(name) })) });
  }
  kickBulkSms();
  return NextResponse.json({ id: batch.id, queued: rows.length }, { status: 201 });
}
