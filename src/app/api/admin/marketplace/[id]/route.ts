import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (typeof b?.approved !== "boolean") return fail("Nothing to change.");
  const r = await db.marketTemplate.updateMany({ where: { id }, data: { approved: b.approved } });
  if (r.count === 0) return fail("Not found.", 404);
  await audit(admin, b.approved ? "marketplace.approve" : "marketplace.hide", { type: "marketTemplate", id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  await db.marketTemplate.deleteMany({ where: { id } });
  await audit(admin, "marketplace.delete", { type: "marketTemplate", id });
  return NextResponse.json({ ok: true });
}
