import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const list = await db.suppression.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 500 });
  return NextResponse.json({ list });
}

/** POST { email } adds; DELETE { email } removes (only manual ones can be removed). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return fail("Enter an email address.");
  await db.suppression.upsert({
    where: { userId_email: { userId: user.wsId, email } },
    create: { userId: user.wsId, email, reason: "MANUAL" },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  const row = await db.suppression.findUnique({ where: { userId_email: { userId: user.wsId, email } } });
  if (!row) return fail("Not on the list.", 404);
  if (row.reason === "UNSUBSCRIBED") return fail("This person unsubscribed themselves. You can't email them again.", 403);
  await db.suppression.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
