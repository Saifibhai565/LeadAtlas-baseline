import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { methodInput } from "@/lib/method-input";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const parsed = methodInput(await req.json().catch(() => ({})));
  if ("error" in parsed) return fail(parsed.error!);
  const r = await db.paymentMethod.updateMany({ where: { id }, data: parsed.data });
  if (r.count === 0) return fail("Not found.", 404);
  await audit(admin, "payment-method.edit", { type: "paymentMethod", id }, parsed.data.name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  await db.paymentMethod.deleteMany({ where: { id } });
  await audit(admin, "payment-method.delete", { type: "paymentMethod", id });
  return NextResponse.json({ ok: true });
}
