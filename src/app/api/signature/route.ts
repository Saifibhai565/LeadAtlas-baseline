import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const sig = await db.userSignature.findUnique({ where: { userId: user.wsId } });
  return NextResponse.json({ ok: true, body: sig?.body || "" });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const body = String(b?.body ?? "").trim();

  const sig = await db.userSignature.upsert({
    where: { userId: user.wsId },
    update: { body },
    create: { userId: user.wsId, body },
  });

  return NextResponse.json({ ok: true, sig });
}