import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendToHubspot } from "@/lib/hubspot";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const maxDuration = 300;

/** POST { ids } — sends up to 200 leads to HubSpot as companies (and contacts). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String).slice(0, 200) : [];
  if (!ids.length) return fail("Select some leads.");
  const leads = await db.lead.findMany({ where: { id: { in: ids }, userId: user.wsId } });
  try {
    return NextResponse.json(await sendToHubspot(user.wsId, leads));
  } catch (err) {
    return fail(err instanceof Error ? err.message : "HubSpot failed.");
  }
}
