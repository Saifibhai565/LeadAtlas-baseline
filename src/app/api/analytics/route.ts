import { NextResponse } from "next/server";
import { analytics } from "@/lib/analytics";
import { apiUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const all = user.isAdmin && new URL(req.url).searchParams.get("scope") === "all";
  return NextResponse.json(await analytics(all ? null : user.wsId));
}
