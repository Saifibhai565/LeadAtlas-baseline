import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { logActivity } from "@/lib/leads";

const OUTCOMES: Record<string, string> = {
  TALKED: "Talked",
  INTERESTED: "Talked, they're interested",
  NO_ANSWER: "No answer",
  CALL_BACK: "Asked to call back",
  NOT_INTERESTED: "Not interested",
  WRONG_NUMBER: "Wrong number",
};

/** POST { outcome, note?, followUpDays? } — records a phone call and what happens next. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId: user.wsId }, select: { status: true } });
  if (!lead) return fail("Lead not found.", 404);
  const b = await req.json().catch(() => ({}));
  const outcome = String(b?.outcome ?? "");
  if (!OUTCOMES[outcome]) return fail("Choose how the call went.");
  const note = String(b?.note ?? "").trim().slice(0, 2000);
  const days = b?.followUpDays != null && b.followUpDays !== "" ? Math.min(90, Math.max(0, Math.round(Number(b.followUpDays)))) : null;

  const data: Record<string, unknown> = { lastContactAt: new Date() };
  let newStatus: string | null = null;
  if (outcome === "INTERESTED") newStatus = "INTERESTED";
  else if (outcome === "NOT_INTERESTED" || outcome === "WRONG_NUMBER") newStatus = "LOST";
  else if (lead.status === "NEW" && outcome !== "NO_ANSWER") newStatus = "CONTACTED";
  if (newStatus && newStatus !== lead.status) data.status = newStatus;
  if (days != null) {
    const d = new Date(Date.now() + days * 86400_000);
    d.setHours(9, 0, 0, 0);
    data.followUpAt = d;
  }
  await db.lead.update({ where: { id }, data });
  await logActivity(user.id, id, "MESSAGE", `Call: ${OUTCOMES[outcome]}${note ? `\n${note}` : ""}`);
  if (newStatus && newStatus !== lead.status) await logActivity(user.id, id, "STATUS", `Moved to ${newStatus.charAt(0) + newStatus.slice(1).toLowerCase()} after a call`);
  return NextResponse.json({ ok: true });
}
