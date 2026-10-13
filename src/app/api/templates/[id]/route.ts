import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { parseTemplate } from "@/lib/template-input";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const parsed = parseTemplate(await req.json().catch(() => null));
  if ("error" in parsed) return fail(parsed.error!);
  const r = await db.template.updateMany({ where: { id, userId: user.wsId }, data: parsed.data });
  if (r.count === 0) return fail("Template not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const r = await db.template.deleteMany({ where: { id, userId: user.wsId } });
  if (r.count === 0) return fail("Template not found.", 404);
  return NextResponse.json({ ok: true });
}
