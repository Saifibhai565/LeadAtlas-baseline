import "server-only";
import { db } from "./db";
import { addPoolLeads, takeFromPool } from "./pool";
import { EngineError, engineCreateJob } from "./engine";

export const LANGS = new Set(["en", "ur", "ar", "hi", "es", "fr", "de", "tr"]);

export type SearchInput = {
  keywords: string[] | string;
  name?: string;
  lang?: string;
  depth?: number;
  maxTime?: number;
  zoom?: number;
  withEmails?: boolean;
  autoCheck?: boolean;
  extraReviews?: boolean;
  watchId?: string | null;
  goal?: number | null;
  groupId?: string | null;
  attempt?: number;
  lat?: number;
  lon?: number;
};

export class SearchError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Validates and starts a Google Maps search for a workspace. Used by the app, watches and the public API. */
export async function createSearch(wsId: string, input: SearchInput) {
  const raw = Array.isArray(input.keywords) ? input.keywords : String(input.keywords ?? "").split("\n");
  const keywords = Array.from(new Set(raw.map((k) => String(k).trim()).filter(Boolean)));
  const name = (String(input.name ?? "").trim() || keywords[0] || "Untitled search").slice(0, 120);
  const lang = String(input.lang ?? "en");
  const depth = Math.round(Number(input.depth ?? 1));
  const maxTime = Math.round(Number(input.maxTime ?? 10));
  const zoom = Math.round(Number(input.zoom ?? 15));

  if (keywords.length === 0) throw new SearchError('Add at least one search, like "dentist in Lahore".');
  if (keywords.length > 50) throw new SearchError("Use up to 50 searches at a time.");
  if (!LANGS.has(lang)) throw new SearchError("Choose a supported language.");
  if (!(depth >= 1 && depth <= 20)) throw new SearchError("Depth must be between 1 and 20.");
  if (!(maxTime >= 3 && maxTime <= 240)) throw new SearchError("Time limit must be between 3 and 240 minutes.");
  if (!(zoom >= 1 && zoom <= 21)) throw new SearchError("Zoom must be between 1 and 21.");

  const owner = await db.user.findUnique({ where: { id: wsId }, select: { credits: true } });
  if (!owner || owner.credits <= 0) throw new SearchError("You're out of credits. Add credits to run new searches.", 402);

  // 1) Instant results from the shared pool (businesses this account doesn't have yet)
  const goal = input.goal && input.goal > 0 ? Math.min(5000, Math.round(input.goal)) : null;
  const fromPool = input.attempt ? [] : await takeFromPool(wsId, keywords, Math.min(goal ?? 100, owner.credits));
  const baseJob = {
    userId: wsId,
    name,
    keywords: JSON.stringify(keywords),
    lang,
    depth,
    withEmails: Boolean(input.withEmails),
    autoCheck: Boolean(input.autoCheck),
    extraReviews: Boolean(input.extraReviews),
    goal,
    groupId: input.groupId ?? null,
    attempt: input.attempt ?? 0,
    watchId: input.watchId ?? null,
  };

  // The pool already covers the whole goal: no need to wait for the engine
  if (goal && fromPool.length >= goal) {
    const job = await db.job.create({
      data: { ...baseJob, engineJobId: `pool_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, status: "DONE", finishedAt: new Date() },
    });
    await addPoolLeads(wsId, job.id, fromPool.slice(0, goal), Boolean(input.autoCheck));
    return { ...job, keywords };
  }

  try {
    const engineJobId = await engineCreateJob({
      name,
      keywords,
      lang,
      depth,
      zoom,
      email: Boolean(input.withEmails),
      maxTimeMinutes: maxTime,
      extraReviews: Boolean(input.extraReviews),
      lat: input.lat,
      lon: input.lon,
    });
    const job = await db.job.create({ data: { ...baseJob, engineJobId } });
    // 2) Pool results show straight away; the engine adds new businesses on top (duplicates are never saved twice)
    if (fromPool.length) await addPoolLeads(wsId, job.id, fromPool, Boolean(input.autoCheck));
    return { ...job, keywords };
  } catch (err) {
    if (err instanceof EngineError) throw new SearchError(err.message, 503);
    throw err;
  }
}
