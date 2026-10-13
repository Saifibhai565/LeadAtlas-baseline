import { NextResponse } from "next/server";
import { adminLeadWhere } from "@/lib/admin-leads";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";

/**
 * POST { action: "delete", ids?: string[], all?: true, query?: string }
 * With all=true it acts on every lead matching the filters in query (the admin's current view).
 */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  if (b?.action !== "delete") return fail("Unknown action.");

  let where;
  if (b?.all === true) {
    where = adminLeadWhere(new URLSearchParams(String(b?.query ?? "")));
  } else {
    const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String).slice(0, 5000) : [];
    if (ids.length === 0) return fail("Select some leads.");
    where = { id: { in: ids } };
  }
  const r = await db.lead.deleteMany({ where });
  await audit(admin, "leads.delete", null, `${r.count} leads${b?.all ? ` matching ${b.query || "everything"}` : ""}`);
  return NextResponse.json({ deleted: r.count });
}
