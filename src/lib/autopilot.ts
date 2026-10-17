import "server-only";
import { AI_ENABLED, callClaude, parseJson } from "./ai";
import { db } from "./db";
import { notify } from "./notify";
import { addPoolLeads, takeFromPool } from "./pool";
import { createSearch, SearchError } from "./searches";

/**
 * AI Autopilot: for each account with it on, once a day, work out good searches from what they
 * sell + their cities, then either add new leads straight away (if they chose auto-add and have
 * credits) or save them as "suggested" for one-click accepting (no credit spent until accepted).
 */
export async function runAutopilot() {
  const dayAgo = new Date(Date.now() - 20 * 3600_000);
  const users = await db.user.findMany({
    where: { ownerId: null, blocked: false, autopilot: true, OR: [{ autopilotRunAt: null }, { autopilotRunAt: { lt: dayAgo } }] },
    select: { id: true, autopilotWhat: true, autopilotCities: true, autopilotDaily: true, autopilotAutoAdd: true, credits: true },
    take: 10,
  });

  for (const u of users) {
    await db.user.update({ where: { id: u.id }, data: { autopilotRunAt: new Date() } });
    const cities = (u.autopilotCities ?? "").split(",").map((c) => c.trim()).filter(Boolean).slice(0, 6);
    if (!u.autopilotWhat || cities.length === 0) continue;
    const goal = Math.min(200, Math.max(5, u.autopilotDaily || 20));

    // AI turns "I sell websites to clinics" into Google-Maps search terms
    let types: string[] = [];
    if (AI_ENABLED) {
      try {
        const out = parseJson<{ types: string[] }>(
          await callClaude(
            `A user describes who they want as customers. List the kinds of local business they'd search for on Google Maps. Short English search terms, most promising first, at most 5. Reply ONLY with JSON: {"types": ["..."]}`,
            u.autopilotWhat,
            300,
          ),
        );
        types = (out.types ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
      } catch {
        types = [];
      }
    }
    if (types.length === 0) types = [u.autopilotWhat.slice(0, 40)];
    const keywords = types.flatMap((t) => cities.map((c) => `${t} in ${c}`)).slice(0, 20);

    // First, try the shared pool (instant, cheap). Then, if auto-add and still short, run a real search.
    const fromPool = await takeFromPool(u.id, keywords, goal);

    if (u.autopilotAutoAdd) {
      if (u.credits <= 0) {
        await notify(u.id, "Autopilot paused: out of credits", "Top up to keep getting daily leads automatically.", "/billing");
        continue;
      }
      let added = 0;
      if (fromPool.length) {
        // make a lightweight job row to attach them to
        const job = await db.job.create({
          data: { userId: u.id, engineJobId: `auto_${Date.now().toString(36)}`, name: "Autopilot", keywords: JSON.stringify(keywords), lang: "en", depth: 2, status: "DONE", finishedAt: new Date(), autoCheck: true },
        });
        added = await addPoolLeads(u.id, job.id, fromPool.slice(0, Math.min(goal, u.credits)), true);
      }
      if (added < goal) {
        try {
          await createSearch(u.id, { keywords, name: "Autopilot", depth: 2, autoCheck: true, goal: goal - added });
        } catch (err) {
          if (!(err instanceof SearchError)) throw err;
        }
      }
      if (added > 0) await notify(u.id, `Autopilot added ${added} new leads today`, "Fresh leads are in your list.", "/leads?sort=score");
    } else {
      // Suggestion mode: save pool leads as "suggested" (no credit), user accepts later
      if (fromPool.length === 0) {
        // kick a real search so tomorrow's pool has fresh businesses; its results become normal leads only if user has autoCheck
        await createSearch(u.id, { keywords, name: "Autopilot (building suggestions)", depth: 2, autoCheck: false, goal }).catch(() => undefined);
        continue;
      }
      const have = new Set(
        (await db.lead.findMany({ where: { userId: u.id, placeKey: { in: fromPool.map((r) => r.placeKey) } }, select: { placeKey: true } })).map((l) => l.placeKey),
      );
      const fresh = fromPool.filter((r) => !have.has(r.placeKey)).slice(0, goal);
      if (fresh.length === 0) continue;
      await db.lead.createMany({
        data: fresh.map((r) => ({
          ...Object.fromEntries(Object.entries(r).filter(([k]) => ["title", "category", "address", "phone", "website", "emails", "rating", "reviewCount", "latitude", "longitude", "mapsUrl", "placeKey"].includes(k))),
          title: r.title,
          placeKey: r.placeKey,
          userId: u.id,
          source: "MAPS",
          suggested: true,
          foundBy: "AUTOPILOT",
        })) as never,
      });
      await notify(u.id, `Autopilot found ${fresh.length} new leads`, "Review and add the ones you want.", "/autopilot");
    }
  }
}
