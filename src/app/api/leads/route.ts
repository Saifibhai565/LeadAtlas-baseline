import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { logActivity, rescoreMissing, STATUS_LABEL } from "@/lib/leads";
import { emit } from "@/lib/webhooks";
import { scheduleLearning } from "@/lib/learn";
import { runAutomations } from "@/lib/automation";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { LEAD_STATUSES, leadWhere } from "./query";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();

  await rescoreMissing(user.wsId, 300);
  kickEnrichment(); // resumes queued website checks after a restart (no-op if already running)

  const params = new URL(req.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const where = leadWhere(user.wsId, params, user.id);

  const [items, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy:
        params.get("sort") === "score"
          ? [{ pinned: "desc" }, { score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
          : [{ pinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize: PAGE_SIZE });
}

/** Update a lead's status: PATCH { id, status } */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const status = String(body?.status ?? "");
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return fail("Unknown status.");

  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { status: true } });
  if (!lead) return fail("Lead not found.", 404);
  if (lead.status !== status) {
    await db.lead.update({ where: { id }, data: { status } });
    await logActivity(user.id, id, "STATUS", `Moved from ${STATUS_LABEL[lead.status] ?? lead.status} to ${STATUS_LABEL[status]}`);
    emit(user.wsId, "lead.status_changed", { id, from: lead.status, to: status }).catch(() => undefined);
    if (status === "WON" || status === "LOST") scheduleLearning(user.wsId);
    runAutomations(user.wsId, user.id, id, status).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
