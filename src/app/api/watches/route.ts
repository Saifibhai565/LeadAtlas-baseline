import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const watches = await db.watch.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ watches: watches.map((w) => ({ ...w, keywords: JSON.parse(w.keywords) as string[] })) });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const keywords = Array.from(new Set(String(b?.keywords ?? "").split("\n").map((k) => k.trim()).filter(Boolean)));
  const name = String(b?.name ?? "").trim().slice(0, 80) || keywords[0];
  const everyDays = [1, 3, 7, 14, 30].includes(Number(b?.everyDays)) ? Number(b.everyDays) : 7;
  const depth = Math.min(10, Math.max(1, Math.round(Number(b?.depth ?? 1))));
  if (keywords.length === 0) return fail("Add at least one search to watch.");
  if (keywords.length > 20) return fail("Watch up to 20 searches at a time.");
  if ((await db.watch.count({ where: { userId: user.wsId } })) >= 50) return fail("You can keep up to 50 watches.");

  const watch = await db.watch.create({
    data: {
      userId: user.wsId,
      name: name!,
      keywords: JSON.stringify(keywords),
      depth,
      everyDays,
      autoCheck: b?.autoCheck !== false,
      nextRunAt: b?.startNow === false ? new Date(Date.now() + everyDays * 86400000) : new Date(),
    },
  });
  return NextResponse.json({ watch }, { status: 201 });
}
