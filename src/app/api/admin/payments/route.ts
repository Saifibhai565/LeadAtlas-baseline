import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";
import { explorerUrl } from "@/lib/method-input";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await apiAdmin())) return forbidden();
  const status = new URL(req.url).searchParams.get("status") ?? "PENDING";
  const payments = await db.payment.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } }, plan: { select: { name: true, credits: true } } },
  });
  const methods = await db.paymentMethod.findMany({ where: { id: { in: payments.map((p) => p.methodId).filter((x): x is string => Boolean(x)) } }, select: { id: true, network: true } });
  return NextResponse.json({
    payments: payments.map((p) => {
      const net = methods.find((m) => m.id === p.methodId)?.network ?? null;
      return { ...p, network: net, explorer: net ? explorerUrl(net, p.reference) : null };
    }),
  });
}
