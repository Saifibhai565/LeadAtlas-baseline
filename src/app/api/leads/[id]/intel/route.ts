import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { findOwnerEmail, runFreeIntel, runPaidIntel } from "@/lib/lead-intel";
import { allow } from "@/lib/ratelimit";

export const maxDuration = 150;

/** POST { action: "check" | "owner-email" | "paid" } — deep check, owner email finder, paid sources. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { id: true } });
  if (!lead) return fail("Lead not found.", 404);
  if (!allow(`intel:${user.wsId}`, 60, 3600_000)) return fail("Too many deep checks this hour. Try again later.", 429);
  const b = await req.json().catch(() => ({}));
  try {
    const intel = b?.action === "owner-email" ? await findOwnerEmail(id) : b?.action === "paid" ? await runPaidIntel(id) : await runFreeIntel(id, { speed: true });
    const fresh = await db.lead.findUnique({ where: { id }, select: { quality: true } });
    return NextResponse.json({ intel, quality: fresh?.quality ?? null });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "The check failed.", 400);
  }
}
