import { NextResponse } from "next/server";
import { aiBudget, callClaude, parseJson } from "@/lib/ai";
import { aiBlocked, aiFail } from "@/lib/ai-route";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const maxDuration = 60;

const SYSTEM = `You plan Google Maps searches for someone looking for business customers.
Turn their description into concrete search lines in the form "<type of business> in <place>".
Use the business types and places most likely to have many listings on Google Maps.
If they name a region or country, pick its main cities and large areas. Use English for business types.
At most 30 lines. Reply ONLY with JSON: {"keywords": ["dentist in Lahore", ...], "note": "one short sentence on the plan"}`;

/** POST { description } — suggests search lines. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = aiBlocked(user);
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const description = String(b?.description ?? "").trim().slice(0, 1000);
  if (description.length < 5) return fail("Describe who you want to find, like “clinics in South Punjab”.");
  try {
    aiBudget(user.wsId);
    const out = parseJson<{ keywords: string[]; note?: string }>(await callClaude(SYSTEM, description, 900));
    const keywords = (out.keywords ?? []).map((k) => String(k).trim()).filter(Boolean).slice(0, 30);
    return NextResponse.json({ keywords, note: out.note ?? null });
  } catch (err) {
    return aiFail(err);
  }
}
