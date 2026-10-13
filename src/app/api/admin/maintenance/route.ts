import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const days = (n: number) => new Date(Date.now() - n * 86400_000);

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const [notifications, emails, rank, errors, sms, wa, audits] = await Promise.all([
    db.notification.count({ where: { createdAt: { lt: days(90) } } }),
    db.emailMessage.count({ where: { createdAt: { lt: days(365) }, status: { in: ["SENT", "CANCELLED", "SKIPPED", "FAILED"] } } }),
    db.rankCheck.count({ where: { createdAt: { lt: days(180) } } }),
    db.errorLog.count({ where: { resolved: true } }),
    db.smsMessage.count({ where: { createdAt: { lt: days(365) } } }),
    db.waMessage.count({ where: { createdAt: { lt: days(730) } } }),
    db.auditLog.count({ where: { createdAt: { lt: days(730) } } }),
  ]);
  return NextResponse.json({ old: { notifications, emails, rank, errors, sms, wa, audits } });
}

/** POST { action: "cleanup" | "optimize" } */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  if (b?.action === "optimize") {
    await db.$executeRawUnsafe("PRAGMA optimize;");
    await db.$executeRawUnsafe("VACUUM;");
    await audit(admin, "system.optimize");
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "cleanup") {
    const r = await db.$transaction([
      db.notification.deleteMany({ where: { createdAt: { lt: days(90) } } }),
      db.emailMessage.deleteMany({ where: { createdAt: { lt: days(365) }, status: { in: ["SENT", "CANCELLED", "SKIPPED", "FAILED"] } } }),
      db.rankCheck.deleteMany({ where: { createdAt: { lt: days(180) } } }),
      db.errorLog.deleteMany({ where: { resolved: true } }),
      db.smsMessage.deleteMany({ where: { createdAt: { lt: days(365) } } }),
      db.waMessage.deleteMany({ where: { createdAt: { lt: days(730) } } }),
      db.auditLog.deleteMany({ where: { createdAt: { lt: days(730) } } }),
    ]);
    const total = r.reduce((s, x) => s + x.count, 0);
    await audit(admin, "system.cleanup", null, `${total} old rows`);
    return NextResponse.json({ deleted: total });
  }
  return fail("Unknown action.");
}
