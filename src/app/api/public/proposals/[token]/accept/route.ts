import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/leads";
import { notify } from "@/lib/notify";
import { allow, clientIp } from "@/lib/ratelimit";

/** The business accepts the proposal from the public link. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!allow(`accept:${clientIp(req)}`, 10, 3600_000)) return NextResponse.json({ error: "Too many tries." }, { status: 429 });
  const { token } = await params;
  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim().slice(0, 80);
  const lead = await db.lead.findUnique({ where: { proposalToken: token } });
  if (!lead || !lead.proposal) return NextResponse.json({ error: "This proposal isn't available." }, { status: 404 });
  if (lead.proposalAcceptedAt) return NextResponse.json({ ok: true, already: true });
  await db.lead.update({ where: { id: lead.id }, data: { proposalAcceptedAt: new Date(), status: "WON" } });
  await logActivity(lead.userId, lead.id, "STATUS", `Accepted the proposal online${name ? ` (${name})` : ""}. Moved to Won.`);
  await notify(lead.userId, `${lead.title} accepted your proposal`, name ? `Accepted by ${name}. Get in touch to start.` : "Get in touch to start.", `/leads?q=${encodeURIComponent(lead.title)}`);
  return NextResponse.json({ ok: true });
}
