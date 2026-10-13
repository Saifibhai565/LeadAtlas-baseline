import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { planInput } from "@/lib/plan-input";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const parsed = planInput((await req.json().catch(() => ({}))) ?? {});
  if ("error" in parsed) return fail(parsed.error!);
  const r = await db.plan.updateMany({ where: { id }, data: parsed.data });
  if (r.count === 0) return fail("Plan not found.", 404);
  await audit(admin, "plan.edit", { type: "plan", id }, `${parsed.data.name}, ${parsed.data.currency} ${parsed.data.price}`);
  return NextResponse.json({ ok: true });
}
