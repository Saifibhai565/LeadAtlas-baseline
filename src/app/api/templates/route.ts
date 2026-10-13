import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { STARTER_TEMPLATES } from "@/lib/template";
import { parseTemplate } from "@/lib/template-input";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  let templates = await db.template.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "asc" } });
  if (templates.length === 0) {
    // First visit: give everyone a few ready-made templates to start from.
    await db.template.createMany({ data: STARTER_TEMPLATES.map((t) => ({ ...t, userId: user.wsId })) });
    templates = await db.template.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "asc" } });
  }
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const parsed = parseTemplate(await req.json().catch(() => null));
  if ("error" in parsed) return fail(parsed.error!);
  if ((await db.template.count({ where: { userId: user.wsId } })) >= 100) return fail("You can keep up to 100 templates.");
  const template = await db.template.create({ data: { ...parsed.data, userId: user.wsId } });
  return NextResponse.json({ template }, { status: 201 });
}
