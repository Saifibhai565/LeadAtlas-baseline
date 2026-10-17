import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const u = await db.user.findUnique({ where: { id: user.wsId }, select: { ipAllow: true } });
  return NextResponse.json({ ipAllow: u?.ipAllow ?? "", isOwner: user.isOwner });
}

/** PATCH { ipAllow } — the owner restricts which networks can sign in. */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can change sign-in restrictions.", 403);
  const b = await req.json().catch(() => ({}));
  const raw = String(b?.ipAllow ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  for (const r of raw) if (!/^\d{1,3}(\.\d{1,3}){0,3}\.?$|^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(r)) return fail(`"${r}" doesn't look like an IP address or prefix.`);
  await db.user.update({ where: { id: user.wsId }, data: { ipAllow: raw.join(",") || null } });
  return NextResponse.json({ ok: true });
}
