import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** All analytics for a workspace (or the whole platform for the Super Admin). */
export async function analytics(wsId: string | null) {
  const leadWhere: Prisma.LeadWhereInput = wsId ? { userId: wsId } : {};
  const ws = wsId ? { userId: wsId } : {};

  // Funnel: scraped -> contacted -> replied/interested -> won
  const [total, contacted, interested, won, lost] = await Promise.all([
    db.lead.count({ where: leadWhere }),
    db.lead.count({ where: { AND: [leadWhere, { status: { in: ["CONTACTED", "INTERESTED", "WON", "LOST"] } }] } }),
    db.lead.count({ where: { AND: [leadWhere, { status: { in: ["INTERESTED", "WON"] } }] } }),
    db.lead.count({ where: { AND: [leadWhere, { status: "WON" }] } }),
    db.lead.count({ where: { AND: [leadWhere, { status: "LOST" }] } }),
  ]);
  const funnel = [
    { stage: "Leads found", count: total },
    { stage: "Contacted", count: contacted },
    { stage: "Interested", count: interested },
    { stage: "Won", count: won },
  ];

  // Sender leaderboard: which mailbox sends and gets opens
  const mailboxes = await db.mailbox.findMany({ where: ws, select: { id: true, fromEmail: true, label: true } });
  const leaderboard = await Promise.all(
    mailboxes.map(async (m) => {
      const [sent, opened] = await Promise.all([
        db.emailMessage.count({ where: { mailboxId: m.id, status: "SENT" } }),
        db.emailMessage.count({ where: { mailboxId: m.id, openedAt: { not: null } } }),
      ]);
      return { name: m.fromEmail, sent, opened, openRate: sent ? Math.round((opened / sent) * 100) : 0 };
    }),
  );
  leaderboard.sort((a, b) => b.openRate - a.openRate || b.sent - a.sent);

  // Reply sentiment: read the activity notes that record replies
  const replies = await db.activity.findMany({
    where: { type: { in: ["NOTE", "MESSAGE"] }, body: { contains: "replied" }, ...(wsId ? { lead: { userId: wsId } } : {}) },
    select: { body: true },
    take: 3000,
  });
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  const POS = /interested|yes|sure|sounds good|let'?s|great|please send|call me|book|keen|definitely|how much|price|when can/i;
  const NEG = /not interested|no thanks|stop|unsubscribe|remove|don'?t|already have|not now|too expensive|busy|leave me/i;
  for (const r of replies) {
    if (NEG.test(r.body)) sentiment.negative++;
    else if (POS.test(r.body)) sentiment.positive++;
    else sentiment.neutral++;
  }

  // Heatmap: when emails get opened, by weekday and hour
  const opens = await db.emailMessage.findMany({ where: { ...ws, openedAt: { not: null } }, select: { openedAt: true }, take: 20000 });
  const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const o of opens) if (o.openedAt) heat[o.openedAt.getDay()][o.openedAt.getHours()]++;

  // ROI: credits spent vs value of won deals
  const [owner, wonValue, creditsBought] = await Promise.all([
    wsId ? db.user.findUnique({ where: { id: wsId }, select: { credits: true } }) : Promise.resolve(null),
    db.lead.aggregate({ where: { AND: [leadWhere, { status: "WON" }] }, _sum: { dealValue: true } }),
    db.payment.aggregate({ where: { ...(wsId ? { userId: wsId } : {}), status: "APPROVED" }, _sum: { amount: true } }),
  ]);
  const roi = {
    leadsUsed: total,
    wonCount: won,
    wonValue: wonValue._sum.dealValue ?? 0,
    spent: creditsBought._sum.amount ?? 0,
    winRate: contacted ? Math.round((won / contacted) * 100) : 0,
    valuePerLead: total ? Math.round(((wonValue._sum.dealValue ?? 0) / total) * 100) / 100 : 0,
  };

  // Activity over the last 30 days
  const since = new Date(Date.now() - 30 * 86400_000);
  const recentLeads = await db.lead.findMany({ where: { AND: [leadWhere, { createdAt: { gte: since } }] }, select: { createdAt: true }, take: 50000 });
  const byDay = new Map<string, number>();
  for (const l of recentLeads) {
    const d = l.createdAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10);
    return { date: d, count: byDay.get(d) ?? 0 };
  });

  return { funnel, leaderboard, sentiment, heat, roi, daily, totalReplies: replies.length };
}
