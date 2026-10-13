import { NextResponse } from "next/server";
import { apiUser, unauthorized } from "@/lib/http";
import { recomputeSignals } from "@/lib/signals-server";

/** POST — recalculates lead signals and scores for the whole account. */
export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  await recomputeSignals(user.wsId);
  return NextResponse.json({ ok: true });
}
