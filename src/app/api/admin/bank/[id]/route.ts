import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { tick } from "@/lib/scheduler";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (b?.action === "pause") await db.scrapeTask.updateMany({ where: { id, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "PAUSED" } });
  else if (b?.action === "resume") {
    await db.scrapeTask.updateMany({ where: { id, status: "PAUSED" }, data: { status: "QUEUED" } });
    tick().catch(() => undefined);
  } else if (b?.action === "retry") {
    await db.scrapeTask.updateMany({ where: { id, status: "FAILED" }, data: { status: "QUEUED", engineJobId: null } });
    tick().catch(() => undefined);
  } else return fail("Unknown action.");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return forbidden();
  const { id } = await params;
  await db.scrapeTask.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** DELETE all finished/failed to tidy up: handled via query ?done=1 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return PATCH(req, { params });
}
