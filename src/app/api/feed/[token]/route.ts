import Papa from "papaparse";
import { db } from "@/lib/db";
import { allow } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Private CSV feed. In Google Sheets: =IMPORTDATA("this link") keeps a sheet in sync with your leads. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) return new Response("Not found", { status: 404 });
  const owner = await db.user.findUnique({ where: { feedToken: token }, select: { id: true, blocked: true } });
  if (!owner || owner.blocked) return new Response("Not found", { status: 404 });
  if (!allow(`feed:${owner.id}`, 60, 3600_000)) return new Response("Too many requests", { status: 429 });

  const leads = await db.lead.findMany({ where: { userId: owner.id }, orderBy: { createdAt: "desc" }, take: 20000 });
  const csv = Papa.unparse(
    leads.map((l) => ({
      Name: l.title,
      Category: l.category ?? "",
      Phone: l.phone ?? "",
      Email: (l.emails ?? "").split(",")[0]?.trim() ?? "",
      Website: l.website ?? "",
      Address: l.address ?? "",
      Rating: l.rating ?? "",
      Reviews: l.reviewCount ?? "",
      Status: l.status,
      Score: l.score ?? "",
      Tags: (l.tags ?? "").split(",").filter(Boolean).join(" "),
      "Follow up": l.followUpAt ? l.followUpAt.toISOString().slice(0, 10) : "",
      Added: l.createdAt.toISOString().slice(0, 10),
    })),
  );
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" } });
}
