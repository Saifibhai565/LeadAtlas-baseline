import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kickEnrichment } from "@/lib/enrich";
import { STATUS_LABEL } from "@/lib/leads";
import { emit } from "@/lib/webhooks";
import { scheduleLearning } from "@/lib/learn";
import { runAutomations } from "@/lib/automation";
import { cleanTag, parseTags, storeTags } from "@/lib/tags";
import { can } from "@/lib/access";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { LEAD_STATUSES } from "../query";

/** POST { ids: string[], action: "status" | "check" | "tag" | "delete", status? } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String).slice(0, 1000) : [];
  if (ids.length === 0) return fail("Select at least one lead.");

  if (body?.action === "status") {
    const status = String(body?.status ?? "");
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) return fail("Unknown status.");
    const owned = await db.lead.findMany({
      where: { id: { in: ids }, userId: user.wsId, status: { not: status } },
      select: { id: true },
    });
    const r = await db.lead.updateMany({ where: { id: { in: owned.map((l) => l.id) } }, data: { status } });
    await db.activity.createMany({
      data: owned.map((l) => ({ userId: user.id, leadId: l.id, type: "STATUS", body: `Moved to ${STATUS_LABEL[status]} (bulk)` })),
    });
    for (const l of owned) emit(user.wsId, "lead.status_changed", { id: l.id, to: status }).catch(() => undefined);
    if (status === "WON" || status === "LOST") scheduleLearning(user.wsId);
    for (const l of owned) runAutomations(user.wsId, user.id, l.id, status).catch(() => undefined);
    return NextResponse.json({ updated: r.count });
  }

  if (body?.action === "tag") {
    const tag = cleanTag(String(body?.tag ?? ""));
    if (!tag) return fail("Type a tag.");
    const remove = body?.mode === "remove";
    const leads = await db.lead.findMany({ where: { id: { in: ids }, userId: user.wsId }, select: { id: true, tags: true } });
    for (const l of leads) {
      const current = parseTags(l.tags);
      const next = remove ? current.filter((t) => t !== tag) : [...current, tag];
      await db.lead.update({ where: { id: l.id }, data: { tags: storeTags(next) } });
    }
    return NextResponse.json({ updated: leads.length });
  }

  if (body?.action === "check") {
    const r = await db.lead.updateMany({
      where: { id: { in: ids }, userId: user.wsId, enrichStatus: { notIn: ["QUEUED", "RUNNING"] } },
      data: { enrichStatus: "QUEUED" },
    });
    if (r.count > 0) kickEnrichment();
    return NextResponse.json({ updated: r.count });
  }

  if (body?.action === "delete") {
    if (!can(user, "delete_leads")) return fail("Only owners and managers can delete leads.", 403);
    const r = await db.lead.deleteMany({ where: { id: { in: ids }, userId: user.wsId } });
    return NextResponse.json({ deleted: r.count });
  }

  return fail("Unknown action.");
}
