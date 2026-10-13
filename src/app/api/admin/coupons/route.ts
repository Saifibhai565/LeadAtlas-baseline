import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

/** POST { code, percent?, amount?, planId?, maxUses?, expiresAt? } */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const code = String(b?.code ?? "").trim().toUpperCase();
  const percent = Math.round(Number(b?.percent ?? 0));
  const amount = Math.round(Number(b?.amount ?? 0));
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return fail("Use 3 to 24 letters or numbers for the code.");
  if (!(percent > 0 && percent <= 100) && !(amount > 0)) return fail("Set a percent (1-100) or a fixed amount off.");
  if (await db.coupon.findUnique({ where: { code } })) return fail("That code already exists.");
  const expires = b?.expiresAt ? new Date(`${b.expiresAt}T23:59:59`) : null;
  if (expires && Number.isNaN(expires.getTime())) return fail("Pick a valid end date.");
  const coupon = await db.coupon.create({
    data: {
      code,
      percent: percent > 0 ? percent : 0,
      amount: percent > 0 ? 0 : amount,
      planId: b?.planId || null,
      maxUses: b?.maxUses ? Math.max(1, Math.round(Number(b.maxUses))) : null,
      expiresAt: expires,
    },
  });
  await audit(admin, "coupon.create", { type: "coupon", id: coupon.id }, code);
  return NextResponse.json({ coupon }, { status: 201 });
}
