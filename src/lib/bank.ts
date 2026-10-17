import "server-only";
import Papa from "papaparse";
import { db } from "./db";
import { engineCreateJob, engineDownloadCsv, engineJobStatus } from "./engine";
import { toLead } from "./jobs";
import { saveToPool } from "./pool";

/** Big cities used to auto-expand a country-wide task like "restaurant in USA". Extend as needed. */
const CITIES: Record<string, string[]> = {
  usa: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin", "San Jose", "Miami", "Atlanta", "Boston", "Seattle", "Denver", "Las Vegas", "Washington DC"],
  uk: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Sheffield", "Edinburgh", "Cardiff"],
  pakistan: ["Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Islamabad", "Multan", "Peshawar", "Quetta", "Gujranwala", "Sialkot", "Hyderabad", "Bahawalpur"],
  uae: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  india: ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"],
  canada: ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Edmonton"],
  australia: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
};

/** If a keyword targets a whole country ("X in USA"), split it into one task per big city. */
export async function expandIfCountry(task: { id: string; keyword: string; country: string | null; depth: number; lang: string }) {
  const m = task.keyword.match(/^(.+?)\s+in\s+(.+)$/i);
  if (!m) return false;
  const what = m[1].trim();
  const place = m[2].trim().toLowerCase().replace(/^the\s+/, "");
  const cities = CITIES[place] ?? CITIES[place.replace(/\s/g, "")];
  if (!cities) return false;
  await db.scrapeTask.createMany({
    data: cities.map((c) => ({ keyword: `${what} in ${c}`, country: task.country ?? place.toUpperCase(), depth: task.depth, lang: task.lang, parentId: task.id, priority: 1 })),
  });
  await db.scrapeTask.update({ where: { id: task.id }, data: { status: "DONE", finishedAt: new Date(), found: 0 } });
  return true;
}

/**
 * One tick of the global scraper: start queued tasks on the engine (up to a few at a time),
 * and import finished ones into the data bank (PlaceCache). Everything is public business data.
 */
export async function processScrapeTasks() {
  // 1) import any running tasks whose engine job finished
  const running = await db.scrapeTask.findMany({ where: { status: "RUNNING", engineJobId: { not: null } }, take: 5 });
  for (const t of running) {
    let st;
    try {
      st = await engineJobStatus(t.engineJobId!);
    } catch {
      return; // engine offline
    }
    if (st === "ok") {
      try {
        const rows = Papa.parse<Record<string, string>>(await engineDownloadCsv(t.engineJobId!), { header: true, skipEmptyLines: true }).data;
        const leads = rows.map(toLead).filter((l): l is NonNullable<typeof l> => Boolean(l?.title && l?.placeKey));
        await saveToPool(leads);
        await db.scrapeTask.update({ where: { id: t.id }, data: { status: "DONE", found: leads.length, finishedAt: new Date() } });
      } catch {
        await db.scrapeTask.update({ where: { id: t.id }, data: { status: "FAILED", finishedAt: new Date() } });
      }
    } else if (st === "failed" || st === "missing") {
      await db.scrapeTask.update({ where: { id: t.id }, data: { status: "FAILED", finishedAt: new Date() } });
    }
  }

  // 2) start new tasks (keep ~3 running at once). Expand country tasks first.
  const active = await db.scrapeTask.count({ where: { status: "RUNNING" } });
  const slots = Math.max(0, 3 - active);
  if (slots === 0) return;
  const queued = await db.scrapeTask.findMany({ where: { status: "QUEUED" }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], take: slots + 3 });
  let started = 0;
  for (const t of queued) {
    if (started >= slots) break;
    if (await expandIfCountry(t)) continue; // turned into city tasks, no engine job
    try {
      const engineJobId = await engineCreateJob({ name: `Bank: ${t.keyword}`, keywords: [t.keyword], lang: t.lang, depth: t.depth, zoom: 13, email: false, maxTimeMinutes: 20, ...(t.lat != null ? { lat: t.lat, lon: t.lng ?? undefined } : {}) });
      await db.scrapeTask.update({ where: { id: t.id }, data: { status: "RUNNING", engineJobId, startedAt: new Date() } });
      started++;
    } catch {
      // engine offline or busy: leave queued, try next tick
      break;
    }
  }
}
