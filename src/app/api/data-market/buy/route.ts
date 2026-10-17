import { NextResponse } from "next/server";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { buyLeads } from "@/lib/marketplace-data";

export const maxDuration = 120;

/** POST { q, count } — buys matching leads from the data bank, charging the wallet. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can buy leads.", 403);
  const b = await req.json().catch(() => ({}));
  const q = String(b?.q ?? "").trim();
  const count = Math.min(10000, Math.max(1, Math.round(Number(b?.count) || 0)));
  if (q.length < 2) return fail("Enter what you want, like “restaurant in USA”.");
  try {
    const r = await buyLeads(user.wsId, q, count);
    return NextResponse.json(r);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Purchase failed.", 400);
  }
}
