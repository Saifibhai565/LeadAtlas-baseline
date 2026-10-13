import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const views = await db.savedView.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ views });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 60);
  const query = String(body?.query ?? "").slice(0, 2000);
  if (!name) return fail("Give this view a name.");
  if (!query) return fail("Set at least one filter before saving a view.");
  if ((await db.savedView.count({ where: { userId: user.wsId } })) >= 30) return fail("You can keep up to 30 saved views.");
  const view = await db.savedView.create({ data: { userId: user.wsId, name, query } });
  return NextResponse.json({ view }, { status: 201 });
}
