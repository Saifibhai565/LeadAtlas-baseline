import "server-only";
import { createHash } from "node:crypto";
import { callClaude, parseJson } from "./ai";
import { db } from "./db";
import { notify } from "./notify";
import { assertPublicHost, fetchPage, htmlToText } from "./web";

/** Checks competitor pages that are due, and when a page changed meaningfully, asks AI what changed. */
export async function processCompetitorWatches() {
  const due = await db.competitorWatch.findMany({ where: { active: true, nextRunAt: { lte: new Date() } }, take: 8 });
  for (const w of due) {
    const next = new Date(Date.now() + Math.max(1, w.everyDays) * 86400_000);
    try {
      const url = new URL(w.url.startsWith("http") ? w.url : `https://${w.url}`);
      await assertPublicHost(url.hostname);
      const page = await fetchPage(url, 15000);
      if (!page?.html) {
        await db.competitorWatch.update({ where: { id: w.id }, data: { nextRunAt: next } });
        continue;
      }
      const text = htmlToText(page.html).replace(/\s+/g, " ").slice(0, 8000);
      const hash = createHash("sha1").update(text).digest("hex");
      if (w.lastHash && w.lastHash !== hash && w.lastText) {
        // Only bother the AI when a fair amount changed
        const changed = diffSize(w.lastText, text);
        if (changed > 0.08) {
          try {
            const out = parseJson<{ changed: boolean; summary: string; offers: string[] }>(
              await callClaude(
                `Two versions of a competitor's web page are given (before and after). Say what meaningfully changed: new offers, prices, services, launches or messaging. Ignore tiny edits. Reply ONLY with JSON: {"changed": true|false, "summary": "one or two sentences", "offers": ["any new offers or prices"]}`,
                `BEFORE:\n${w.lastText.slice(0, 3500)}\n\nAFTER:\n${text.slice(0, 3500)}`,
                500,
              ),
            );
            if (out.changed) {
              await db.competitorWatch.update({ where: { id: w.id }, data: { lastChange: JSON.stringify({ ...out, at: new Date().toISOString() }) } });
              await notify(w.userId, `${w.name} changed their page`, out.summary.slice(0, 140), "/competitors");
            }
          } catch {
            /* AI budget or parse issue: still save the new snapshot below */
          }
        }
      }
      await db.competitorWatch.update({ where: { id: w.id }, data: { lastHash: hash, lastText: text, nextRunAt: next } });
    } catch {
      await db.competitorWatch.update({ where: { id: w.id }, data: { nextRunAt: next } });
    }
  }
}

/** Rough share of words that differ between two snapshots. */
function diffSize(a: string, b: string) {
  const wa = new Set(a.toLowerCase().split(/\s+/));
  const wb = b.toLowerCase().split(/\s+/);
  const neww = wb.filter((x) => !wa.has(x)).length;
  return wb.length ? neww / wb.length : 0;
}
