import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { parseSequenceInput } from "@/lib/sequence-input";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const seq = await db.sequence.findFirst({ where: { id, userId: user.wsId } });
  if (!seq) return fail("Sequence not found.", 404);
  const enrollments = await db.sequenceEnrollment.findMany({
    where: { sequenceId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { lead: { select: { id: true, title: true, emails: true } }, mailbox: { select: { label: true } } },
  });
  return NextResponse.json({ sequence: { ...seq, steps: JSON.parse(seq.steps) }, enrollments });
}

/** PATCH { name?, steps?, active? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b?.active === "boolean") data.active = b.active;
  if (b?.steps || b?.name) {
    const parsed = parseSequenceInput(b);
    if ("error" in parsed) return fail(parsed.error!);
    data.name = parsed.data.name;
    data.steps = JSON.stringify(parsed.data.steps);
  }
  const r = await db.sequence.updateMany({ where: { id, userId: user.wsId }, data });
  if (r.count === 0) return fail("Sequence not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  // Queued emails from this sequence are cancelled
  const ens = await db.sequenceEnrollment.findMany({ where: { sequenceId: id, userId: user.wsId }, select: { id: true } });
  await db.emailMessage.updateMany({ where: { enrollmentId: { in: ens.map((e) => e.id) }, status: "QUEUED" }, data: { status: "CANCELLED" } });
  const r = await db.sequence.deleteMany({ where: { id, userId: user.wsId } });
  if (r.count === 0) return fail("Sequence not found.", 404);
  return NextResponse.json({ ok: true });
}
