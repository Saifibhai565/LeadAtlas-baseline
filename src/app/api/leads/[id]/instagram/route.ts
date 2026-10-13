import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { igUsername, refreshInstagram } from "@/lib/instagram";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { socials: true } });
  if (!lead) return fail("Lead not found.", 404);
  if (!igUsername(lead.socials)) return fail("No Instagram link found for this lead. Run a website check first.");
  try {
    const d = await refreshInstagram(id);
    if (!d) return fail("Connect Instagram in Settings first.", 400);
    return NextResponse.json({ followers: d.followers_count ?? null, posts: d.media_count ?? null });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Instagram lookup failed.", 502);
  }
}
