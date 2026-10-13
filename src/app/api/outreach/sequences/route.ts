import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { parseSequenceInput } from "@/lib/sequence-input";
import { outreachBlocked } from "@/lib/outreach-route";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const seqs = await db.sequence.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" } });
  const out = await Promise.all(
    seqs.map(async (s) => {
      const groups = await db.sequenceEnrollment.groupBy({ by: ["status"], where: { sequenceId: s.id }, _count: { _all: true } });
      const counts = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
      const ids = (await db.sequenceEnrollment.findMany({ where: { sequenceId: s.id }, select: { id: true } })).map((e) => e.id);
      const [sent, opened] = await Promise.all([
        db.emailMessage.count({ where: { enrollmentId: { in: ids }, status: "SENT" } }),
        db.emailMessage.count({ where: { enrollmentId: { in: ids }, openedAt: { not: null } } }),
      ]);
      return { ...s, steps: JSON.parse(s.steps), counts, sent, opened };
    }),
  );
  return NextResponse.json({ sequences: out });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const blocked = outreachBlocked(user);
  if (blocked) return blocked;
  const parsed = parseSequenceInput(await req.json().catch(() => null));
  if ("error" in parsed) return fail(parsed.error!);
  if ((await db.sequence.count({ where: { userId: user.wsId } })) >= 50) return fail("You can keep up to 50 sequences.");
  const seq = await db.sequence.create({ data: { userId: user.wsId, name: parsed.data.name, steps: JSON.stringify(parsed.data.steps) } });
  return NextResponse.json({ sequence: { ...seq, steps: parsed.data.steps } }, { status: 201 });
}
