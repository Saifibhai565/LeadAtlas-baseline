import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";
import { storeTags } from "@/lib/tags";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, userId: user.wsId },
    include: {
      job: { select: { name: true } },
      assignedTo: { select: { id: true, name: true } },
      enrollments: { orderBy: { createdAt: "desc" }, include: { sequence: { select: { name: true, steps: true } } } },
      emailMessages: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, subject: true, status: true, sentAt: true, openedAt: true, error: true, createdAt: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } },
    },
  });
  if (!lead) return fail("Lead not found.", 404);
  return NextResponse.json({ lead });
}

/** PATCH { followUpAt?: ISO string | null, dealValue?: number | null } */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { id: true } });
  if (!lead) return fail("Lead not found.", 404);

  const body = await req.json().catch(() => ({}));
  const data: { followUpAt?: Date | null; dealValue?: number | null; assignedToId?: string | null; tags?: string | null } = {};

  if (Array.isArray(body.tags)) data.tags = storeTags(body.tags.map(String));
  if (typeof body.optIn === "boolean") {
    Object.assign(data, { optIn: body.optIn, optInAt: body.optIn ? new Date() : null });
    await logActivity(user.id, id, "NOTE", body.optIn ? "Marked as agreed to receive WhatsApp/SMS messages" : "Opt-in removed");
  }

  if ("assignedToId" in body) {
    const to = body.assignedToId ? String(body.assignedToId) : null;
    if (to) {
      const ok = await db.user.findFirst({ where: { id: to, OR: [{ id: user.wsId }, { ownerId: user.wsId }], blocked: false } });
      if (!ok) return fail("That person isn't in your team.");
    }
    data.assignedToId = to;
  }

  if ("followUpAt" in body) {
    if (body.followUpAt === null || body.followUpAt === "") data.followUpAt = null;
    else {
      const d = new Date(body.followUpAt);
      if (Number.isNaN(d.getTime())) return fail("Pick a valid follow-up date.");
      data.followUpAt = d;
    }
  }
  if ("dealValue" in body) {
    const v = body.dealValue === null || body.dealValue === "" ? null : Number(body.dealValue);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return fail("Deal value must be a positive number.");
    data.dealValue = v;
  }

  await db.lead.update({ where: { id }, data });
  if (data.assignedToId !== undefined) {
    const who = data.assignedToId ? await db.user.findUnique({ where: { id: data.assignedToId }, select: { name: true } }) : null;
    await logActivity(user.id, id, "STATUS", who ? `Assigned to ${who.name}` : "Unassigned");
  }
  if (data.followUpAt !== undefined) {
    await logActivity(
      user.id,
      id,
      "FOLLOW_UP",
      data.followUpAt
        ? `Follow-up set for ${data.followUpAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
        : "Follow-up cleared",
    );
  }
  return NextResponse.json({ ok: true });
}
