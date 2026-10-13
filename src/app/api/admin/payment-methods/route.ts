import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { methodInput } from "@/lib/method-input";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  return NextResponse.json({ methods: await db.paymentMethod.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }] }) });
}

export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const parsed = methodInput(await req.json().catch(() => ({})));
  if ("error" in parsed) return fail(parsed.error!);
  const m = await db.paymentMethod.create({ data: parsed.data });
  await audit(admin, "payment-method.create", { type: "paymentMethod", id: m.id }, `${m.name} (${m.currency})`);
  return NextResponse.json({ method: m }, { status: 201 });
}
