import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const current = String(b?.current ?? "");
  const next = String(b?.next ?? "");
  if (next.length < 8) return fail("Use at least 8 characters for your new password.");
  const me = await db.user.findUnique({ where: { id: user.id } });
  if (!me || !(await bcrypt.compare(current, me.passwordHash))) return fail("Your current password is incorrect.", 401);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return NextResponse.json({ ok: true });
}
