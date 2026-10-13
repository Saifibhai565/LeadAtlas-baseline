import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { forgetTransport } from "@/lib/outreach";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { active?, dailyLimit?, gapSeconds?, trackOpens?, label?, fromName?, password? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can change mailboxes.", 403);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.active === true) data.lastError = null;
  if (b.dailyLimit != null) data.dailyLimit = Math.min(200, Math.max(5, Math.round(Number(b.dailyLimit))));
  if (b.gapSeconds != null) data.gapSeconds = Math.min(3600, Math.max(60, Math.round(Number(b.gapSeconds))));
  if (typeof b.trackOpens === "boolean") data.trackOpens = b.trackOpens;
  if (b.label) data.label = String(b.label).trim().slice(0, 60);
  if (b.fromName) data.fromName = String(b.fromName).trim().slice(0, 80);
  if (b.password) data.passEnc = encrypt(String(b.password));
  const r = await db.mailbox.updateMany({ where: { id, userId: user.wsId }, data });
  if (r.count === 0) return fail("Mailbox not found.", 404);
  forgetTransport(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can remove mailboxes.", 403);
  const { id } = await params;
  const r = await db.mailbox.deleteMany({ where: { id, userId: user.wsId } });
  if (r.count === 0) return fail("Mailbox not found.", 404);
  forgetTransport(id);
  return NextResponse.json({ ok: true });
}
