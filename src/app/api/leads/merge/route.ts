import { NextResponse } from "next/server";
import { apiUser, unauthorized } from "@/lib/http";
import { mergeDuplicates } from "@/lib/lead-intel";

export const maxDuration = 120;

/** POST — merges the same business saved more than once (same phone or website). */
export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  return NextResponse.json({ merged: await mergeDuplicates(user.wsId) });
}
