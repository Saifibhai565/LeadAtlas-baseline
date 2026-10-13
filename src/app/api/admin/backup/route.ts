import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Downloads a consistent copy of the whole database (admin only). */
export async function GET() {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const file = join(tmpdir(), `leadatlas-backup-${randomBytes(6).toString("hex")}.db`);
  try {
    await db.$executeRawUnsafe(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const data = await fs.readFile(file);
    await audit(admin, "system.backup", null, `${Math.round(data.length / 1024)} KB`);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="leadatlas-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    fs.unlink(file).catch(() => undefined);
  }
}
