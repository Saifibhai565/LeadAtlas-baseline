import Papa from "papaparse";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { leadWhere } from "../query";

export const dynamic = "force-dynamic";

function social(json: string | null, key: string) {
  if (!json) return "";
  try {
    return (JSON.parse(json) as Record<string, string>)[key] ?? "";
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();

  const params = new URL(req.url).searchParams;
  const leads = await db.lead.findMany({
    where: leadWhere(user.wsId, params, user.id),
    orderBy: { createdAt: "desc" },
    take: 50_000,
  });

  const csv = Papa.unparse(
    leads.map((l) => ({
      Name: l.title,
      Category: l.category ?? "",
      Phone: l.phone ?? "",
      Email: l.emails ?? "",
      Website: l.website ?? "",
      Address: l.address ?? "",
      Rating: l.rating ?? "",
      Reviews: l.reviewCount ?? "",
      Status: l.status,
      Tags: (l.tags ?? "").split(",").filter(Boolean).join(", "),
      "Email domain": l.emailStatus ?? "",
      "Other phones": l.extraPhones ?? "",
      Facebook: social(l.socials, "facebook"),
      Instagram: social(l.socials, "instagram"),
      LinkedIn: social(l.socials, "linkedin"),
      "Website score": l.auditScore ?? "",
      "Website issues": l.auditIssues ?? "",
      "Built with": l.tech ?? "",
      Source: l.source,
      "AI message": l.aiMessage ?? "",
      Latitude: l.latitude ?? "",
      Longitude: l.longitude ?? "",
      "Google Maps": l.mapsUrl ?? "",
      Added: l.createdAt.toISOString(),
    })),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens Urdu/special characters correctly
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${stamp}.csv"`,
    },
  });
}
