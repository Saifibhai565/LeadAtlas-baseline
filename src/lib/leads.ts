import "server-only";
import { db } from "./db";
import { scoreLead } from "./score";

async function boostsFor(wsId: string): Promise<Record<string, number>> {
  const u = await db.user.findUnique({ where: { id: wsId }, select: { categoryBoosts: true } });
  try {
    return u?.categoryBoosts ? JSON.parse(u.categoryBoosts) : {};
  } catch {
    return {};
  }
}

export async function rescoreLead(id: string) {
  const l = await db.lead.findUnique({ where: { id } });
  if (!l) return;
  const score = scoreLead(l, await boostsFor(l.userId)); // l.signals is part of the lead
  if (score !== l.score) await db.lead.update({ where: { id }, data: { score } });
}

/** Scores leads saved before scoring existed. Runs in small batches. */
export async function rescoreMissing(userId: string, limit = 500) {
  const rows = await db.lead.findMany({ where: { userId, score: null }, take: limit });
  if (rows.length === 0) return 0;
  const boosts = await boostsFor(userId);
  for (const l of rows) await db.lead.update({ where: { id: l.id }, data: { score: scoreLead(l, boosts) } });
  return rows.length;
}

export async function logActivity(userId: string, leadId: string, type: string, body: string) {
  await db.activity.create({ data: { userId, leadId, type, body: body.slice(0, 4000) } });
}

export const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  WON: "Won",
  LOST: "Lost",
};
