import "server-only";
import { db } from "./db";
import { syncActiveJobs } from "./jobs";
import { notify } from "./notify";
import { emails } from "./emails";
import { sendMailLater, appUrl} from "./mail";
import { createSearch, SearchError } from "./searches";
import { processOutbox, processSequences } from "./outreach";
import { processApiCampaigns } from "./campaign-send";
import { processSms } from "./sms";
import { processRankChecks } from "./rank";
import { processScrapeTasks } from "./bank";
import { processCompetitorWatches } from "./competitors";

const g = globalThis as unknown as { __tick?: { running: boolean; last: number } };
const MIN_GAP_MS = 60_000;

/**
 * Runs due watches and keeps unattended searches moving.
 * Called from often-polled routes (cheap no-op most of the time) and from /api/cron.
 */
export async function tick(force = false) {
  if (!g.__tick) g.__tick = { running: false, last: 0 };
  const state = g.__tick;
  if (state.running || (!force && Date.now() - state.last < MIN_GAP_MS)) return;
  state.running = true;
  state.last = Date.now();
  try {
    // 1) Start watches that are due
    const due = await db.watch.findMany({ where: { active: true, nextRunAt: { lte: new Date() } }, take: 20 });
    for (const w of due) {
      const next = new Date(Date.now() + w.everyDays * 86400000);
      await db.watch.update({ where: { id: w.id }, data: { nextRunAt: next, lastRunAt: new Date() } });
      try {
        await createSearch(w.userId, {
          keywords: JSON.parse(w.keywords) as string[],
          name: `${w.name} (watch)`,
          lang: w.lang,
          depth: w.depth,
          autoCheck: w.autoCheck,
          watchId: w.id,
        });
      } catch (err) {
        const msg = err instanceof SearchError ? err.message : "The search couldn't start.";
        await notify(w.userId, `Watch “${w.name}” didn't run`, msg, "/watches");
        if (err instanceof SearchError && err.status === 503) {
          // Engine offline: try again in an hour instead of waiting a whole cycle
          await db.watch.update({ where: { id: w.id }, data: { nextRunAt: new Date(Date.now() + 3600_000) } });
        }
      }
    }

    // 2) Remind owners 3 days before their plan ends (once per period)
    const soon = new Date(Date.now() + 3 * 86400_000);
    const expiring = await db.user.findMany({
      where: { ownerId: null, blocked: false, planId: { not: null }, planExpiresAt: { gt: new Date(), lte: soon } },
      select: { id: true, email: true, planExpiresAt: true, expiryReminderAt: true, plan: { select: { name: true } } },
      take: 50,
    });
    for (const u of expiring) {
      const alreadyReminded = u.expiryReminderAt && u.expiryReminderAt.getTime() > u.planExpiresAt!.getTime() - 5 * 86400_000;
      if (alreadyReminded) continue;
      await db.user.update({ where: { id: u.id }, data: { expiryReminderAt: new Date() } });
      sendMailLater(emails.planExpiring(u.email, u.plan?.name ?? "your", u.planExpiresAt!));
      await notify(u.id, "Your plan ends in a few days", "Renew on the Billing page to keep your credits and features.", "/billing");
    }

    // 3) Monday digest for account owners who keep email alerts on
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() >= 8) {
      const sixDays = new Date(Date.now() - 6 * 86400_000);
      const owners = await db.user.findMany({
        where: { ownerId: null, blocked: false, emailAlerts: true, OR: [{ digestSentAt: null }, { digestSentAt: { lt: sixDays } }] },
        select: { id: true, email: true, name: true },
        take: 30,
      });
      const weekAgo = new Date(Date.now() - 7 * 86400_000);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      for (const o of owners) {
        await db.user.update({ where: { id: o.id }, data: { digestSentAt: now } });
        const [newLeads, statusMoves, due, hot] = await Promise.all([
          db.lead.count({ where: { userId: o.id, createdAt: { gte: weekAgo } } }),
          db.activity.findMany({ where: { lead: { userId: o.id }, type: "STATUS", createdAt: { gte: weekAgo } }, select: { body: true } }),
          db.lead.count({ where: { userId: o.id, followUpAt: { lte: endOfToday }, status: { notIn: ["WON", "LOST"] } } }),
          db.lead.findMany({ where: { userId: o.id, status: "NEW", score: { not: null } }, orderBy: { score: "desc" }, take: 5, select: { title: true, score: true } }),
        ]);
        if (newLeads === 0 && statusMoves.length === 0 && due === 0) continue; // nothing to say
        const moved = (to: string) => statusMoves.filter((a) => a.body.includes(`to ${to}`)).length;
        sendMailLater(
          emails.weeklyDigest(o.email, o.name, {
            newLeads,
            contacted: moved("Contacted"),
            interested: moved("Interested"),
            won: moved("Won"),
            due,
            hot: hot.map((h) => ({ title: h.title, score: h.score ?? 0 })),
          }),
        );
      }
    }

    // 4) Email outreach: due sequence steps, then send what's queued
    await processSequences().catch((e) => console.error("Sequences:", e));
    await processOutbox().catch((e) => console.error("Outbox:", e));
    await processApiCampaigns().catch((e) => console.error("Campaigns:", e));
    await processSms().catch((e) => console.error("SMS:", e));
    { const { kickBulkSms } = await import("./bulk-sms"); kickBulkSms(); }
    // Warmup runs about every 30 minutes
    const gw = globalThis as unknown as { __warmupAt?: number };
    if (!gw.__warmupAt || Date.now() - gw.__warmupAt > 30 * 60_000) {
      gw.__warmupAt = Date.now();
      const { runWarmup } = await import("./warmup");
      await runWarmup().catch((e) => console.error("Warmup:", e));
    }
    await processRankChecks().catch((e) => console.error("Rank:", e));
    await processScrapeTasks().catch((e) => console.error("Bank:", e));
    await processCompetitorWatches().catch((e) => console.error("Competitors:", e));

    // AI Autopilot: once a day per account
    const ga = globalThis as unknown as { __autopilotAt?: number };
    if (!ga.__autopilotAt || Date.now() - ga.__autopilotAt > 60 * 60_000) {
      ga.__autopilotAt = Date.now();
      const { runAutopilot } = await import("./autopilot");
      await runAutopilot().catch((e) => console.error("Autopilot:", e));
    }

    // Monday: email the analytics report to owners who turned it on
    const nowR = new Date();
    if (nowR.getDay() === 1 && nowR.getHours() >= 8) {
      const sixDays = new Date(Date.now() - 6 * 86400_000);
      const owners = await db.user.findMany({
        where: { ownerId: null, blocked: false, weeklyReport: true, OR: [{ weeklyReportAt: null }, { weeklyReportAt: { lt: sixDays } }] },
        select: { id: true, name: true, email: true },
        take: 30,
      });
      if (owners.length) {
        const { analytics } = await import("./analytics");
        const { emails } = await import("./emails");
        for (const o of owners) {
          await db.user.update({ where: { id: o.id }, data: { weeklyReportAt: nowR } });
          const a = await analytics(o.id);
          sendMailLater(emails.weeklyReport(o.email, o.name, { winRate: a.roi.winRate, won: a.roi.wonCount, wonValue: a.roi.wonValue, newLeads: a.funnel[0].count, contacted: a.funnel[1].count }, appUrl("/analytics")));
        }
      }
    }

    // Re-check open leads every 30 days so phones, websites and signals stay fresh
    const stale = await db.lead.findMany({
      where: { website: { not: null }, enrichStatus: "DONE", enrichedAt: { lt: new Date(Date.now() - 30 * 86400_000) }, status: { in: ["NEW", "CONTACTED", "INTERESTED"] } },
      select: { id: true },
      take: 20,
    });
    if (stale.length) {
      await db.lead.updateMany({ where: { id: { in: stale.map((l) => l.id) } }, data: { enrichStatus: "QUEUED" } });
      const { kickEnrichment } = await import("./enrich");
      kickEnrichment();
    }

    // 5) Keep every running search importing, even if nobody has the app open
    const owners = await db.job.findMany({
      where: { status: { in: ["PENDING", "RUNNING"] } },
      select: { userId: true },
      distinct: ["userId"],
    });
    for (const o of owners) await syncActiveJobs(o.userId).catch(() => undefined);
  } finally {
    state.running = false;
  }
}
