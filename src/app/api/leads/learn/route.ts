import { NextResponse } from "next/server";
import { apiUser, unauthorized } from "@/lib/http";
import { learnBoosts, rescoreWorkspace } from "@/lib/learn";

/** POST — learns from won and lost deals and re-scores open leads. */
export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { boosts, decided, won } = await learnBoosts(user.wsId);
  const changed = await rescoreWorkspace(user.wsId);
  return NextResponse.json({ boosts, decided, won, changed });
}
