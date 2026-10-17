import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

const TRIGGERS = ["status:NEW", "status:CONTACTED", "status:INTERESTED", "status:WON", "status:LOST"];
const ACTIONS = ["tag", "followup", "sequence", "assign", "note"];

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const [automations, sequences, members] = await Promise.all([
    db.automation.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" } }),
    db.sequence.findMany({ where: { userId: user.wsId, active: true }, select: { id: true, name: true } }),
    db.user.findMany({ where: { ownerId: user.wsId }, select: { id: true, name: true } }),
  ]);
  return NextResponse.json({ automations, sequences, members });
}

/** POST { name, trigger, action, value } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (!user.isOwner) return fail("Only the account owner can set up automations.", 403);
  const b = await req.json().catch(() => ({}));
  const trigger = String(b?.trigger ?? "");
  const action = String(b?.action ?? "");
  const value = String(b?.value ?? "").trim();
  if (!TRIGGERS.includes(trigger)) return fail("Choose when it runs.");
  if (!ACTIONS.includes(action)) return fail("Choose what it does.");
  if (!value && action !== "note") return fail("Add the detail (tag, days, sequence or person).");
  const a = await db.automation.create({
    data: { userId: user.wsId, name: String(b?.name ?? "").trim().slice(0, 80) || "Automation", trigger, action, value: value.slice(0, 500) },
  });
  return NextResponse.json({ id: a.id }, { status: 201 });
}
