import "server-only";
import { db } from "./db";
import { scoreLead } from "./score";

/**
 * Learns which categories this workspace wins most often and turns it into a small score boost (-10 to +15).
 * Needs at least 3 decided leads (won or lost) in a category.
 */
export async function learnBoosts(wsId: string) {
  const rows = await db.lead.groupBy({
    by: ["category", "status"],
    where: { userId: wsId, status: { in: ["WON", "LOST"] }, category: { not: null } },
    _count: { _all: true },
  });
  const per = new Map<string, { won: number; lost: number }>();
  let won = 0;
  let lost = 0;
  for (const r of rows) {
    const c = r.category as string;
    const e = per.get(c) ?? { won: 0, lost: 0 };
    if (r.status === "WON") {
      e.won += r._count._all;
      won += r._count._all;
    } else {
      e.lost += r._count._all;
      lost += r._count._all;
    }
    per.set(c, e);
  }
  const overall = won + lost > 0 ? won / (won + lost) : 0;
  const boosts: Record<string, number> = {};
  for (const [c, e] of per) {
    const n = e.won + e.lost;
    if (n < 3) continue;
    const rate = e.won / n;
    boosts[c] = Math.max(-10, Math.min(15, Math.round((rate - overall) * 40)));
  }
  await db.user.update({ where: { id: wsId }, data: { categoryBoosts: JSON.stringify(boosts) } });
  return { boosts, decided: won + lost, won };
}

export async function getBoosts(wsId: string): Promise<Record<string, number>> {
  const u = await db.user.findUnique({ where: { id: wsId }, select: { categoryBoosts: true } });
  try {
    return u?.categoryBoosts ? JSON.parse(u.categoryBoosts) : {};
  } catch {
    return {};
  }
}

/** Re-scores every open lead of the workspace with the learned boosts. */
export async function rescoreWorkspace(wsId: string, limit = 5000) {
  const boosts = await getBoosts(wsId);
  const leads = await db.lead.findMany({ where: { userId: wsId, status: { in: ["NEW", "CONTACTED", "INTERESTED"] } }, take: limit });
  let changed = 0;
  for (const l of leads) {
    const s = scoreLead(l, boosts);
    if (s !== l.score) {
      await db.lead.update({ where: { id: l.id }, data: { score: s } });
      changed++;
    }
  }
  return changed;
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();
/** After a lead is won or lost, re-learn a minute later (batched if several change at once). */
export function scheduleLearning(wsId: string) {
  if (pending.has(wsId)) return;
  pending.set(
    wsId,
    setTimeout(() => {
      pending.delete(wsId);
      learnBoosts(wsId)
        .then(() => rescoreWorkspace(wsId))
        .catch(() => undefined);
    }, 60_000),
  );
}
