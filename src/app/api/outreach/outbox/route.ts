import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET ?status=QUEUED|SENT|FAILED|ALL */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const status = new URL(req.url).searchParams.get("status") ?? "ALL";
  const messages = await db.emailMessage.findMany({
    where: { userId: user.wsId, ...(status === "ALL" ? {} : { status }) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      toEmail: true,
      subject: true,
      status: true,
      error: true,
      step: true,
      createdAt: true,
      sentAt: true,
      openedAt: true,
      lead: { select: { id: true, title: true } },
      mailbox: { select: { label: true } },
    },
  });
  const [queued, sent, failed, opened] = await Promise.all([
    db.emailMessage.count({ where: { userId: user.wsId, status: "QUEUED" } }),
    db.emailMessage.count({ where: { userId: user.wsId, status: "SENT" } }),
    db.emailMessage.count({ where: { userId: user.wsId, status: "FAILED" } }),
    db.emailMessage.count({ where: { userId: user.wsId, openedAt: { not: null } } }),
  ]);
  return NextResponse.json({ messages, counts: { queued, sent, failed, opened } });
}

/** POST { id, action: "cancel" | "retry" } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const id = String(b?.id ?? "");
  if (b?.action === "retry") {
    const r = await db.emailMessage.updateMany({ where: { id, userId: user.wsId, status: "FAILED" }, data: { status: "QUEUED", error: null, scheduledAt: new Date() } });
    if (r.count === 0) return fail("Only failed emails can be retried.");
    return NextResponse.json({ ok: true });
  }
  const r = await db.emailMessage.updateMany({ where: { id, userId: user.wsId, status: "QUEUED" }, data: { status: "CANCELLED" } });
  if (r.count === 0) return fail("Only queued emails can be cancelled.");
  return NextResponse.json({ ok: true });
}
