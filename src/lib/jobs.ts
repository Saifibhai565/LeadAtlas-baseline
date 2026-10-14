import "server-only";
import Papa from "papaparse";
import { db } from "./db";
import { EngineError, engineDownloadCsv, engineJobStatus } from "./engine";
import { kickEnrichment } from "./enrich";
import { scoreLead } from "./score";
import { notify } from "./notify";
import { cleanEmails, mapsDetails } from "./lead-details";
import { recomputeSignals } from "./signals-server";
import { emails } from "./emails";
import { appUrl, sendMailLater } from "./mail";
import { emit, publicLead } from "./webhooks";

async function emitNewLeads(userId: string, placeKeys: string[]) {
  if (placeKeys.length === 0) return;
  const listening = await db.webhook.count({ where: { userId, active: true, events: { contains: "lead.created" } } });
  if (!listening) return;
  const leads = await db.lead.findMany({ where: { userId, placeKey: { in: placeKeys } } });
  await emit(userId, "lead.created", { leads: leads.map(publicLead) });
}

const ACTIVE = ["PENDING", "RUNNING"];

type Row = Record<string, string | undefined>;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function num(v: string | undefined) {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function text(v: string | undefined) {
  const t = v?.trim();
  return t ? t : null;
}

type RawReview = { Name?: string; Rating?: number; Description?: string; When?: string };

function parseJson<T>(v: string | undefined): T | null {
  if (!v || !v.trim() || v.trim() === "null") return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/** Keeps up to 20 reviews with text, newest first as Google gives them, trimmed for storage. */
function reviewsFrom(row: Row) {
  const all = [
    ...(parseJson<RawReview[]>(row.user_reviews) ?? []),
    ...(parseJson<RawReview[]>(row.user_reviews_extended) ?? []),
  ];
  const seen = new Set<string>();
  const out: { n: string; r: number; t: string; w: string }[] = [];
  for (const r of all) {
    const t = (r.Description ?? "").replace(/\s+/g, " ").trim();
    const key = `${r.Name}|${t.slice(0, 60)}`;
    if (!r.Rating || seen.has(key)) continue;
    seen.add(key);
    out.push({ n: (r.Name ?? "").slice(0, 60), r: Math.round(r.Rating), t: t.slice(0, 600), w: (r.When ?? "").slice(0, 40) });
    if (out.length >= 20) break;
  }
  return out;
}

function toLead(row: Row) {
  const title = text(row.title);
  if (!title) return null;
  const placeKey =
    text(row.place_id) ?? text(row.cid) ?? text(row.data_id) ?? `${title}|${text(row.address) ?? ""}`.toLowerCase();
  const emails = cleanEmails((row.emails ?? "").match(EMAIL_RE) ?? []);
  const rating = num(row.review_rating);
  const reviews = num(row.review_count);
  const reviewList = reviewsFrom(row);
  const dist = parseJson<Record<string, number>>(row.reviews_per_rating);
  const low = dist ? (Number(dist["1"]) || 0) + (Number(dist["2"]) || 0) : reviewList.filter((r) => r.r <= 2).length || null;
  return {
    placeKey,
    title,
    category: text(row.category),
    address: text(row.address),
    phone: text(row.phone),
    website: text(row.website),
    emails: emails.length ? emails.join(", ") : null,
    rating: rating && rating > 0 ? Math.round(rating * 10) / 10 : null,
    reviewCount: reviews != null ? Math.round(reviews) : null,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    mapsUrl: text(row.link),
    priceRange: text(row.price_range),
    description: text(row.descriptions)?.slice(0, 1000) ?? null,
    openHours: text(row.open_hours)?.slice(0, 2000) ?? null,
    thumbnail: text(row.thumbnail),
    reviews: reviewList.length ? JSON.stringify(reviewList) : null,
    ratingDist: dist ? JSON.stringify(dist) : null,
    lowReviews: low,
    popularTimes: text(row.popular_times)?.slice(0, 5000) ?? null,
    details: mapsDetails(row),
  };
}

// Serialises imports per job inside this server process, so overlapping polls never insert twice.
const locks = new Map<string, Promise<void>>();
const lastPartial = new Map<string, number>();
const PARTIAL_EVERY_MS = 6000;

function withLock(jobId: string, fn: () => Promise<void>) {
  const prev = locks.get(jobId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(jobId, next.catch(() => undefined));
  return next;
}

/**
 * Reads the engine's CSV (complete or still being written) and saves leads we don't have yet.
 * While a search is running the last row may be half-written, so it's skipped until the next pass.
 */
async function importRows(jobId: string, engineJobId: string, userId: string, final: boolean) {
  const csv = await engineDownloadCsv(engineJobId);
  const parsed = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true });
  const badRows = new Set(parsed.errors.map((e) => e.row));
  let rows = parsed.data.filter((_, i) => !badRows.has(i));
  if (!final && rows.length > 0) rows = rows.slice(0, -1);

  const byKey = new Map<string, NonNullable<ReturnType<typeof toLead>>>();
  for (const row of rows) {
    const lead = toLead(row);
    if (lead && !byKey.has(lead.placeKey)) byKey.set(lead.placeKey, lead);
  }
  const incoming = Array.from(byKey.values());

  const existing = await db.lead.findMany({
    where: { userId, placeKey: { in: incoming.map((l) => l.placeKey) } },
    select: { id: true, placeKey: true, title: true, rating: true, reviewCount: true, lowReviews: true },
  });
  const known = new Set(existing.map((l) => l.placeKey));

  // Leads we already had: refresh their numbers and spot changes worth acting on
  const incomingByKey = new Map(incoming.map((l) => [l.placeKey, l]));
  const changes: string[] = [];
  for (const old of existing) {
    const now = incomingByKey.get(old.placeKey);
    if (!now) continue;
    const events: string[] = [];
    if (old.rating != null && now.rating != null && now.rating <= old.rating - 0.2) events.push("RATING_DROP");
    if (now.lowReviews != null && now.lowReviews > (old.lowReviews ?? 0)) events.push("BAD_REVIEW");
    const newReviews = now.reviewCount != null && old.reviewCount != null ? now.reviewCount - old.reviewCount : 0;
    await db.lead.update({
      where: { id: old.id },
      data: {
        rating: now.rating ?? undefined,
        reviewCount: now.reviewCount ?? undefined,
        lowReviews: now.lowReviews ?? undefined,
        reviews: now.reviews ?? undefined,
        ratingDist: now.ratingDist ?? undefined,
        popularTimes: now.popularTimes ?? undefined,
        details: now.details ?? undefined,
        ...(events.length ? { lastSignal: events.join(","), lastSignalAt: new Date() } : {}),
      },
    });
    if (newReviews > 0 && !events.length) changes.push(`${old.title}: ${newReviews} new review${newReviews > 1 ? "s" : ""} (now ${now.reviewCount}, ★ ${now.rating ?? "?"})`);
    if (events.length) {
      changes.push(
        `${old.title}: ${events.includes("RATING_DROP") ? `rating ${old.rating} → ${now.rating}` : ""}${events.length === 2 ? ", " : ""}${events.includes("BAD_REVIEW") ? "new bad review" : ""}`,
      );
    }
  }
  if (changes.length) {
    await notify(
      userId,
      changes.length === 1 ? `Change spotted: ${changes[0]}` : `${changes.length} of your leads changed`,
      changes.slice(0, 5).join("\n"),
      "/leads?sort=score",
    );
  }
  let fresh = incoming.filter((l) => !known.has(l.placeKey));

  const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true } });
  const available = Math.max(0, user?.credits ?? 0);
  const outOfCredits = fresh.length > available;
  fresh = fresh.slice(0, available);

  const job = await db.job.findUnique({ where: { id: jobId }, select: { autoCheck: true, goal: true, groupId: true } });
  const autoCheck = Boolean(job?.autoCheck);

  // A search with a goal ("I want 50 new leads") saves no more than what's still missing
  if (job?.goal) {
    const group = job.groupId ?? jobId;
    const agg = await db.job.aggregate({ where: { OR: [{ id: group }, { groupId: group }] }, _sum: { newCount: true } });
    const remaining = Math.max(0, job.goal - (agg._sum.newCount ?? 0));
    fresh = fresh.slice(0, remaining);
  }

  await db.$transaction([
    db.lead.createMany({
      data: fresh.map((l) => ({
        ...l,
        userId,
        jobId,
        enrichStatus: autoCheck && l.website ? "QUEUED" : "NONE",
        score: scoreLead(l),
      })),
    }),
    db.user.update({ where: { id: userId }, data: { credits: { decrement: fresh.length } } }),
    db.job.update({
      where: { id: jobId },
      data: {
        resultCount: incoming.length,
        newCount: { increment: fresh.length },
        ...(outOfCredits ? { error: "You ran out of credits, so some results weren't saved." } : {}),
        ...(final ? { status: "DONE", finishedAt: new Date() } : {}),
      },
    }),
  ]);

  if (autoCheck && fresh.some((l) => l.website)) kickEnrichment();
  if (final || fresh.length || existing.length) recomputeSignals(userId).catch(() => undefined);
  emitNewLeads(userId, fresh.map((l) => l.placeKey)).catch(() => undefined);

  if (final) {
    const done = await db.job.findUnique({ where: { id: jobId }, include: { watch: true } });
    if (done) {
      if (done.watch) {
        await db.watch.update({ where: { id: done.watch.id }, data: { lastNewCount: done.newCount } });
        if (done.newCount > 0) {
          await notify(
            userId,
            `${done.newCount} new businesses in “${done.watch.name}”`,
            "Your watch found businesses you didn't have before. New businesses are often the most open to offers.",
            `/leads?jobId=${done.id}`,
          );
          const owner = await db.user.findUnique({ where: { id: userId }, select: { email: true, emailAlerts: true } });
          if (owner?.emailAlerts) {
            sendMailLater(emails.watchFound(owner.email, done.watch.name, done.newCount, appUrl(`/leads?jobId=${done.id}`)));
          }
        }
      }
      if (done.goal) await continueTowardGoal(done.id);
      await emit(userId, "search.finished", {
        id: done.id,
        name: done.name,
        keywords: JSON.parse(done.keywords),
        found: done.resultCount,
        newLeads: done.newCount,
        finishedAt: done.finishedAt,
      });
    }
  }
}

/** Saves whatever the running search has found so far (throttled). */
async function importPartial(jobId: string, engineJobId: string, userId: string) {
  const now = Date.now();
  if (now - (lastPartial.get(jobId) ?? 0) < PARTIAL_EVERY_MS) return;
  lastPartial.set(jobId, now);
  await withLock(jobId, async () => {
    try {
      await importRows(jobId, engineJobId, userId, false);
    } catch {
      // The CSV may not exist yet in the first seconds of a search. Try again next poll.
    }
  });
}

/** Final import once the engine says the search is finished. */
async function importFinal(jobId: string, engineJobId: string, userId: string) {
  await withLock(jobId, async () => {
    const claimed = await db.job.updateMany({
      where: { id: jobId, status: { in: ACTIVE } },
      data: { status: "IMPORTING" },
    });
    if (claimed.count === 0) return;
    try {
      await importRows(jobId, engineJobId, userId, true);
    } catch (err) {
      await db.job.update({
        where: { id: jobId },
        data: { status: "FAILED", error: err instanceof Error ? err.message : "Import failed." },
      });
    } finally {
      lastPartial.delete(jobId);
    }
  });
}

/** Checks the engine for every unfinished search of this user and saves new leads as they arrive. */
export async function syncActiveJobs(userId: string) {
  const active = await db.job.findMany({
    where: { userId, status: { in: ACTIVE } },
    select: { id: true, engineJobId: true, status: true },
  });

  for (const job of active) {
    let status;
    try {
      status = await engineJobStatus(job.engineJobId);
    } catch (err) {
      if (err instanceof EngineError) return { engineOnline: false };
      throw err;
    }

    if (status === "working") {
      if (job.status !== "RUNNING") await db.job.update({ where: { id: job.id }, data: { status: "RUNNING" } });
      await importPartial(job.id, job.engineJobId, userId);
    } else if (status === "ok") {
      await importFinal(job.id, job.engineJobId, userId);
    } else if (status === "failed" || status === "missing") {
      // Keep anything already saved, then mark the search as failed.
      if (status === "failed") await importPartial(job.id, job.engineJobId, userId);
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: status === "missing" ? "The engine no longer has this search." : "The engine reported a failure.",
        },
      });
    }
  }
  return { engineOnline: true };
}

/**
 * After a search with a goal finishes: if it found fewer NEW leads than wanted, start another round
 * that goes deeper and a bit further out, up to 5 rounds. Leads you already have are never saved twice.
 */
async function continueTowardGoal(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job?.goal) return;
  const group = job.groupId ?? job.id;
  const agg = await db.job.aggregate({ where: { OR: [{ id: group }, { groupId: group }] }, _sum: { newCount: true } });
  const got = agg._sum.newCount ?? 0;
  const baseName = job.name.replace(/ \(round \d+\)$/, "");
  if (got >= job.goal) {
    await notify(job.userId, `Goal reached: ${got} new leads`, `“${baseName}” found the ${job.goal} new leads you asked for.`, `/leads`);
    return;
  }
  if (job.attempt >= 4) {
    await notify(job.userId, `Found ${got} of ${job.goal} new leads`, `“${baseName}” ran out of new businesses nearby. Try another area or a related search.`, `/searches`);
    return;
  }
  // Center of what we've found so far, then step outwards in a different direction each round
  const center = await db.lead.aggregate({ where: { userId: job.userId, job: { OR: [{ id: group }, { groupId: group }] }, latitude: { not: null } }, _avg: { latitude: true, longitude: true } });
  const steps = [[0, 0], [4, 0], [0, 4], [-4, 0], [0, -4]];
  const [dx, dy] = steps[(job.attempt + 1) % steps.length];
  const lat = center._avg.latitude != null ? center._avg.latitude + dy / 111 : undefined;
  const lon = center._avg.longitude != null && center._avg.latitude != null ? center._avg.longitude + dx / (111 * Math.cos((center._avg.latitude * Math.PI) / 180)) : undefined;
  try {
    const { createSearch } = await import("./searches");
    await createSearch(job.userId, {
      keywords: JSON.parse(job.keywords) as string[],
      name: `${baseName} (round ${job.attempt + 2})`,
      lang: job.lang,
      depth: Math.min(20, job.depth + 5),
      withEmails: job.withEmails,
      autoCheck: job.autoCheck,
      extraReviews: job.extraReviews,
      goal: job.goal,
      groupId: group,
      attempt: job.attempt + 1,
      lat,
      lon,
    });
  } catch {
    await notify(job.userId, `Found ${got} of ${job.goal} new leads`, "The next round couldn't start (engine offline or out of credits).", "/searches");
  }
}
