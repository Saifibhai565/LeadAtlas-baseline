import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enginePing } from "@/lib/engine";
import { apiAdmin, forbidden } from "@/lib/http";
import { SMTP_READY } from "@/lib/mail";
import { AI_ENABLED } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const g = globalThis as unknown as { __tick?: { last: number }; __enrichWorker?: { running: boolean } };

  const [engine, searches, enrichQueue, enrichFailed, outboxQueued, outboxFailed, sentToday, pausedBoxes, pages, pageSize, leads, users] =
    await Promise.all([
      enginePing(),
      db.job.count({ where: { status: { in: ["PENDING", "RUNNING", "IMPORTING"] } } }),
      db.lead.count({ where: { enrichStatus: { in: ["QUEUED", "RUNNING"] } } }),
      db.lead.count({ where: { enrichStatus: "FAILED", enrichedAt: { gte: dayAgo } } }),
      db.emailMessage.count({ where: { status: "QUEUED" } }),
      db.emailMessage.count({ where: { status: "FAILED", createdAt: { gte: dayAgo } } }),
      db.emailMessage.count({ where: { status: "SENT", sentAt: { gte: dayAgo } } }),
      db.mailbox.count({ where: { active: false } }),
      db.$queryRawUnsafe<{ page_count: bigint | number }[]>("PRAGMA page_count;"),
      db.$queryRawUnsafe<{ page_size: bigint | number }[]>("PRAGMA page_size;"),
      db.lead.count(),
      db.user.count(),
    ]);

  const dbBytes = Number(pages[0]?.page_count ?? 0) * Number(pageSize[0]?.page_size ?? 0);
  const mem = process.memoryUsage();
  return NextResponse.json({
    engine,
    smtp: SMTP_READY,
    ai: AI_ENABLED,
    cronSecretSet: Boolean(process.env.CRON_SECRET),
    lastTick: g.__tick?.last ? new Date(g.__tick.last).toISOString() : null,
    enrichRunning: Boolean(g.__enrichWorker?.running),
    searches,
    enrichQueue,
    enrichFailed,
    outboxQueued,
    outboxFailed,
    sentToday,
    pausedBoxes,
    dbBytes,
    leads,
    users,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(mem.rss / 1024 / 1024),
    nodeVersion: process.version,
  });
}
