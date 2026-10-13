import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (typeof b?.active !== "boolean") return fail("Nothing to change.");
  const r = await db.coupon.updateMany({ where: { id }, data: { active: b.active } });
  if (r.count === 0) return fail("Coupon not found.", 404);
  await audit(admin, b.active ? "coupon.enable" : "coupon.disable", { type: "coupon", id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) return fail("Coupon not found.", 404);
  await db.coupon.delete({ where: { id } });
  await audit(admin, "coupon.delete", { type: "coupon", id }, c.code);
  return NextResponse.json({ ok: true });
}
