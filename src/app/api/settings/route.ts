import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, businessName: true, offer: true, signature: true, emailAlerts: true },
  });
  return NextResponse.json({ me });
}

export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim();
  if (name.length < 2) return fail("Enter your name.");
  await db.user.update({
    where: { id: user.id },
    data: {
      name: name.slice(0, 80),
      businessName: String(b?.businessName ?? "").trim().slice(0, 120) || null,
      offer: String(b?.offer ?? "").trim().slice(0, 1000) || null,
      signature: String(b?.signature ?? "").trim().slice(0, 300) || null,
      ...(typeof b?.emailAlerts === "boolean" ? { emailAlerts: b.emailAlerts } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
