import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Creates (or returns) a public link to this lead's website report. */
export async function POST(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId } });
  if (!lead) return fail("Lead not found.", 404);
  if (lead.website && lead.enrichStatus !== "DONE") return fail("Check this lead's website first, then share the report.");
  const token = lead.reportToken ?? randomBytes(12).toString("base64url");
  if (!lead.reportToken) await db.lead.update({ where: { id }, data: { reportToken: token } });
  return NextResponse.json({ path: `/r/${token}` });
}

/** Turns the public link off. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.lead.updateMany({ where: { id, userId: user.wsId }, data: { reportToken: null } });
  return NextResponse.json({ ok: true });
}
