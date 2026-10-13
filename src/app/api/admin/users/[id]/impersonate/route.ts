import { NextResponse } from "next/server";
import { startImpersonation } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";

/** Admin support tool: see the app exactly as this person does. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  if (id === admin.id) return fail("That's you.");
  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, blocked: true, email: true } });
  if (!target) return fail("User not found.", 404);
  if (target.blocked) return fail("Unblock this account first.");
  await audit(admin, "user.impersonate", { type: "user", id }, target.email);
  await startImpersonation(target);
  return NextResponse.json({ ok: true });
}
