import "server-only";
import { db } from "./db";
import { scoreLead } from "./score";
import { bestContactTime, computeSignals } from "./signals";

function host(website: string | null) {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const running = new Set<string>();

/** Recomputes signals, branches, best time and score for a workspace's leads. Safe to call often. */
export async function recomputeSignals(wsId: string) {
  if (running.has(wsId)) return;
  running.add(wsId);
  try {
    const leads = await db.lead.findMany({ where: { userId: wsId }, take: 20000 });
    const boostsRow = await db.user.findUnique({ where: { id: wsId }, select: { categoryBoosts: true } });
    let boosts: Record<string, number> = {};
    try {
      boosts = boostsRow?.categoryBoosts ? JSON.parse(boostsRow.categoryBoosts) : {};
    } catch {
      boosts = {};
    }
    // Branches: same website host (not social pages) or same exact name
    const byHost = new Map<string, number>();
    const byName = new Map<string, number>();
    for (const l of leads) {
      const h = host(l.website);
      if (h && !/facebook|instagram|wixsite|blogspot|linktr/.test(h)) byHost.set(h, (byHost.get(h) ?? 0) + 1);
      const n = l.title.trim().toLowerCase();
      byName.set(n, (byName.get(n) ?? 0) + 1);
    }
    for (const l of leads) {
      const h = host(l.website);
      const branches = Math.max(h ? byHost.get(h) ?? 1 : 1, byName.get(l.title.trim().toLowerCase()) ?? 1);
      const signals = computeSignals({ ...l, branches }).join(",") || null;
      const bestTime = bestContactTime(l.popularTimes);
      const score = scoreLead({ ...l, signals }, boosts);
      if (signals !== l.signals || branches !== l.branches || bestTime !== l.bestTime || score !== l.score) {
        await db.lead.update({ where: { id: l.id }, data: { signals, branches, bestTime, score } });
      }
    }
  } finally {
    running.delete(wsId);
  }
}

/** Signals and score for one lead (keeps its saved branch count). */
export async function recomputeLeadSignals(id: string) {
  const l = await db.lead.findUnique({ where: { id } });
  if (!l) return;
  const owner = await db.user.findUnique({ where: { id: l.userId }, select: { categoryBoosts: true } });
  let boosts: Record<string, number> = {};
  try {
    boosts = owner?.categoryBoosts ? JSON.parse(owner.categoryBoosts) : {};
  } catch {
    boosts = {};
  }
  const signals = computeSignals(l).join(",") || null;
  const bestTime = bestContactTime(l.popularTimes);
  const score = scoreLead({ ...l, signals }, boosts);
  if (signals !== l.signals || bestTime !== l.bestTime || score !== l.score) {
    await db.lead.update({ where: { id }, data: { signals, bestTime, score } });
  }
}

const refreshed = new Set<string>();
/** Re-scores a workspace once per server start, so score formula updates apply to old leads too. */
export function refreshOncePerStart(wsId: string) {
  if (refreshed.has(wsId)) return;
  refreshed.add(wsId);
  recomputeSignals(wsId).catch(() => refreshed.delete(wsId));
}
