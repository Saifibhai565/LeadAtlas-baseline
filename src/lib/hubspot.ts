import "server-only";
import { decrypt } from "./crypto";
import { db } from "./db";

type L = { title: string; website: string | null; phone: string | null; address: string | null; category: string | null; emails: string | null };

/** Creates the business as a Company in HubSpot (and a Contact for its email). Needs a private app token with crm.objects.companies.write. */
export async function sendToHubspot(wsId: string, leads: L[]) {
  const owner = await db.user.findUnique({ where: { id: wsId }, select: { hubspotTokenEnc: true } });
  if (!owner?.hubspotTokenEnc) throw new Error("Connect HubSpot in Settings first.");
  const token = decrypt(owner.hubspotTokenEnc);
  let ok = 0;
  const errors: string[] = [];
  for (const l of leads) {
    const domain = l.website ? l.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : undefined;
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { name: l.title, domain, phone: l.phone ?? undefined, address: l.address ?? undefined, industry: undefined, description: l.category ?? undefined } }),
    });
    if (res.ok) {
      ok++;
      const email = (l.emails ?? "").split(",")[0]?.trim();
      if (email) {
        await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: { email, company: l.title, phone: l.phone ?? undefined, website: l.website ?? undefined } }),
        }).catch(() => undefined);
      }
    } else {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      errors.push(j.message ?? `HubSpot answered ${res.status}`);
      if (res.status === 401) break;
    }
  }
  return { ok, failed: leads.length - ok, error: errors[0] ?? null };
}
