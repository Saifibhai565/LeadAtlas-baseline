import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { notify } from "@/lib/notify";
import { adjustWallet } from "@/lib/wallet";

/** POST { action: "approve" | "reject", note? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const dep = await db.deposit.findUnique({ where: { id } });
  if (!dep) return fail("Deposit not found.", 404);
  if (dep.status !== "PENDING") return fail("Already reviewed.");
  const b = await req.json().catch(() => ({}));
  const note = String(b?.note ?? "").slice(0, 300) || null;

  if (b?.action === "reject") {
    await db.deposit.update({ where: { id }, data: { status: "REJECTED", adminNote: note, reviewedAt: new Date() } });
    await notify(dep.userId, "Deposit not confirmed", note ?? "Please check the details and try again.", "/wallet");
    await audit(admin, "deposit.reject", { type: "deposit", id }, `${dep.amount} ${dep.currency}`);
    return NextResponse.json({ ok: true });
  }
  if (b?.action !== "approve") return fail("Unknown action.");
  const balance = await adjustWallet(dep.userId, dep.amount, "deposit", `${dep.method} ${dep.reference}`);
  await db.deposit.update({ where: { id }, data: { status: "APPROVED", adminNote: note, reviewedAt: new Date() } });
  await notify(dep.userId, `Wallet topped up: ${dep.currency} ${dep.amount}`, `Your balance is now ${dep.currency} ${balance}.`, "/wallet");
  await audit(admin, "deposit.approve", { type: "deposit", id }, `${dep.amount} ${dep.currency} -> balance ${balance}`);
  return NextResponse.json({ ok: true });
}
