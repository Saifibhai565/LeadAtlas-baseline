import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { planInput } from "@/lib/plan-input";
import { ensurePlans } from "@/lib/settings";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  await ensurePlans();
  const plans = await db.plan.findMany({ orderBy: { sort: "asc" }, include: { _count: { select: { users: true } } } });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const parsed = planInput((await req.json().catch(() => ({}))) ?? {});
  if ("error" in parsed) return fail(parsed.error!);
  const plan = await db.plan.create({ data: parsed.data });
  await audit(admin, "plan.create", { type: "plan", id: plan.id }, `${plan.name}, ${plan.currency} ${plan.price}`);
  return NextResponse.json({ plan }, { status: 201 });
}
