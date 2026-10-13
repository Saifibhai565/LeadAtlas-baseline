import Papa from "papaparse";
import { adminLeadWhere } from "@/lib/admin-leads";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** CSV of every lead matching the filters (or the ids given), across all customers. */
export async function GET(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const p = new URL(req.url).searchParams;
  const ids = p.get("ids")?.split(",").filter(Boolean);
  const where = ids?.length ? { id: { in: ids.slice(0, 5000) } } : adminLeadWhere(p);
  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100_000,
    include: { user: { select: { name: true, email: true } } },
  });
  const csv = Papa.unparse(
    leads.map((l) => ({
      Customer: l.user.name,
      "Customer email": l.user.email,
      Name: l.title,
      Category: l.category ?? "",
      Phone: l.phone ?? "",
      Email: l.emails ?? "",
      Website: l.website ?? "",
      Address: l.address ?? "",
      Rating: l.rating ?? "",
      Reviews: l.reviewCount ?? "",
      Status: l.status,
      Source: l.source,
      Tags: (l.tags ?? "").split(",").filter(Boolean).join(", "),
      "Google Maps": l.mapsUrl ?? "",
      Added: l.createdAt.toISOString(),
    })),
  );
  await audit(admin, "leads.export", null, `${leads.length} leads`);
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="all-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
