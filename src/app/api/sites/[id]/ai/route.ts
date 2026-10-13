import { NextResponse } from "next/server";
import { aiBudget, callClaude } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { sanitizeHtml } from "@/lib/sanitize";

export const maxDuration = 120;

/** POST { instruction } — asks AI to change the website, e.g. "make it blue" or "add Sunday hours 10-4". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const { id } = await params;
  const site = await db.site.findFirst({ where: { id, userId: user.wsId } });
  if (!site) return fail("Not found.", 404);
  const b = await req.json().catch(() => ({}));
  const instruction = String(b?.instruction ?? "").trim().slice(0, 1000);
  if (instruction.length < 3) return fail("Say what to change.");
  try {
    aiBudget(user.wsId, 3);
    let html = await callClaude(
      "You edit a one-page website. Apply the requested change and return ONLY the complete updated HTML document. Keep everything else the same. No JavaScript, no external files.",
      `Change: ${instruction}\n\nCurrent HTML:\n${site.html}`,
      8000,
    );
    html = html.replace(/^```(?:html)?/i, "").replace(/```$/, "").trim();
    if (!/<html[\s>]/i.test(html)) return fail("The change didn't come out right. Try saying it differently.", 502);
    await db.site.update({ where: { id }, data: { html: sanitizeHtml(html).slice(0, 300_000) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return aiFail(err);
  }
}
