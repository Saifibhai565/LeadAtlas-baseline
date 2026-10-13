import "server-only";
import Papa from "papaparse";
import { db } from "./db";
import { engineCreateJob, engineDownloadCsv, engineJobStatus } from "./engine";
import { notify } from "./notify";

export type RankPoint = { lat: number; lng: number; engineJobId: string | null; status: "pending" | "done" | "failed"; rank: number | null };

/** Grid of points around a center, spacing in km. */
export function gridPoints(lat: number, lng: number, size: number, spacingKm: number) {
  const half = Math.floor(size / 2);
  const dLat = spacingKm / 111;
  const dLng = spacingKm / (111 * Math.cos((lat * Math.PI) / 180));
  const pts: { lat: number; lng: number }[] = [];
  for (let r = -half; r <= half; r++) for (let c = -half; c <= half; c++) pts.push({ lat: lat + r * dLat, lng: lng + c * dLng });
  return pts;
}

export async function startRankCheck(opts: { wsId: string; leadId: string | null; keyword: string; targetName: string; targetKey: string | null; lat: number; lng: number; size: number; spacingKm: number }) {
  const pts = gridPoints(opts.lat, opts.lng, opts.size, opts.spacingKm);
  const points: RankPoint[] = [];
  for (const p of pts) {
    let engineJobId: string | null = null;
    try {
      engineJobId = await engineCreateJob({
        name: `Rank: ${opts.keyword}`,
        keywords: [opts.keyword],
        lang: "en",
        depth: 1,
        zoom: 15,
        email: false,
        maxTimeMinutes: 5,
        lat: Number(p.lat.toFixed(6)),
        lon: Number(p.lng.toFixed(6)),
      });
    } catch {
      engineJobId = null;
    }
    points.push({ lat: p.lat, lng: p.lng, engineJobId, status: engineJobId ? "pending" : "failed", rank: null });
  }
  if (points.every((p) => !p.engineJobId)) throw new Error("The scraping engine isn't running. Start it and try again.");
  return db.rankCheck.create({
    data: {
      userId: opts.wsId,
      leadId: opts.leadId,
      keyword: opts.keyword,
      targetName: opts.targetName,
      targetKey: opts.targetKey,
      centerLat: opts.lat,
      centerLng: opts.lng,
      size: opts.size,
      spacingKm: opts.spacingKm,
      points: JSON.stringify(points),
    },
  });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Checks the engine for every running rank check and fills in positions. */
export async function processRankChecks() {
  const running = await db.rankCheck.findMany({ where: { status: "RUNNING" }, take: 10 });
  for (const rc of running) {
    const points = JSON.parse(rc.points) as RankPoint[];
    let changed = false;
    for (const p of points) {
      if (p.status !== "pending" || !p.engineJobId) continue;
      let st;
      try {
        st = await engineJobStatus(p.engineJobId);
      } catch {
        return; // engine offline: try again later
      }
      if (st === "ok") {
        try {
          const rows = Papa.parse<Record<string, string>>(await engineDownloadCsv(p.engineJobId), { header: true, skipEmptyLines: true }).data;
          const target = norm(rc.targetName);
          const idx = rows.findIndex((r) => {
            const keys = [r.place_id, r.cid, r.data_id].filter(Boolean);
            if (rc.targetKey && keys.includes(rc.targetKey)) return true;
            const t = norm(r.title ?? "");
            return t === target || (t.length > 4 && (t.includes(target) || target.includes(t)));
          });
          p.rank = idx >= 0 && idx < 20 ? idx + 1 : null;
          p.status = "done";
        } catch {
          p.status = "failed";
        }
        changed = true;
      } else if (st === "failed" || st === "missing") {
        p.status = "failed";
        changed = true;
      }
    }
    const pending = points.some((p) => p.status === "pending");
    if (changed || !pending) {
      const found = points.filter((p) => p.rank != null).map((p) => p.rank!);
      const avg = points.length ? (found.reduce((a, b) => a + b, 0) + (points.length - found.length) * 21) / points.length : null;
      await db.rankCheck.update({
        where: { id: rc.id },
        data: {
          points: JSON.stringify(points),
          ...(pending ? {} : { status: "DONE", finishedAt: new Date(), avgRank: avg != null ? Math.round(avg * 10) / 10 : null }),
        },
      });
      if (!pending) {
        await notify(rc.userId, `Rank check finished: ${rc.targetName}`, `“${rc.keyword}”: in the top 3 at ${points.filter((p) => p.rank && p.rank <= 3).length} of ${points.length} spots.`, `/rank?id=${rc.id}`);
      }
    }
  }
}
