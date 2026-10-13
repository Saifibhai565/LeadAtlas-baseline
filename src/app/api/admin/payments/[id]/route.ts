import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { approvePayment } from "@/lib/billing";
import { db } from "@/lib/db";
import { emails } from "@/lib/emails";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { sendMailLater } from "@/lib/mail";

/**
 * POST { action: "approve" | "reject", note? }
 * Approving switches on the plan for 30 days (added on top of any time left) and adds its credits.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const note = String(b?.note ?? "").slice(0, 300) || null;

  const payment = await db.payment.findUnique({ where: { id }, include: { plan: true, user: true } });
  if (!payment) return fail("Payment not found.", 404);
  if (payment.status !== "PENDING") return fail("This payment was already reviewed.");

  if (b?.action === "reject") {
    await db.payment.update({ where: { id }, data: { status: "REJECTED", adminNote: note, reviewedAt: new Date() } });
    sendMailLater(emails.paymentRejected(payment.user.email, payment.plan.name, note));
    await audit(admin, "payment.reject", { type: "payment", id }, `${payment.user.email}, ${payment.plan.name}, ${payment.reference}${note ? `: ${note}` : ""}`);
    return NextResponse.json({ ok: true });
  }
  if (b?.action !== "approve") return fail("Unknown action.");

  try {
    const { expires, invoiceNo } = await approvePayment(id, note);
    await audit(admin, "payment.approve", { type: "payment", id }, `${payment.user.email}, ${payment.plan.name}, ${payment.currency} ${payment.amount}, invoice ${invoiceNo}`);
    return NextResponse.json({ ok: true, expires });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Couldn't approve.");
  }
}
