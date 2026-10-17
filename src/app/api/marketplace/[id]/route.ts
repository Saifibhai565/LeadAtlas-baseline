import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/** POST — add this marketplace template to your own templates (or as a sequence). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const m = await db.marketTemplate.findFirst({ where: { id, approved: true } });
  if (!m) return fail("Template not found.", 404);

  if (m.channel === "SEQUENCE") {
    // body holds JSON steps
    let steps;
    try {
      steps = JSON.parse(m.body);
    } catch {
      return fail("This sequence couldn't be read.");
    }
    await db.sequence.create({ data: { userId: user.wsId, name: m.name, steps: JSON.stringify(steps) } });
  } else {
    await db.template.create({ data: { userId: user.wsId, name: m.name, channel: m.channel === "SMS" ? "WHATSAPP" : m.channel, subject: m.subject, body: m.body } });
  }
  await db.marketTemplate.update({ where: { id }, data: { uses: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}
