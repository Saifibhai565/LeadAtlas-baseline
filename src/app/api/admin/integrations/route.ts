import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, forbidden } from "@/lib/http";
import { getIntelKeys } from "@/lib/lead-intel";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const k = await getIntelKeys();
  // Show only whether each key is set, never the key itself
  return NextResponse.json({ keys: Object.fromEntries(["psi", "safebrowsing", "similarweb", "apollo", "zerobounce", "numverify"].map((x) => [x, Boolean(k[x as keyof typeof k])])) });
}

/** PATCH { psi?, safebrowsing?, similarweb?, apollo?, zerobounce? } — empty string removes a key; missing leaves it. */
export async function PATCH(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const k = await getIntelKeys();
  for (const x of ["psi", "safebrowsing", "similarweb", "apollo", "zerobounce", "numverify"] as const) {
    if (typeof b[x] === "string") {
      if (b[x].trim()) k[x] = b[x].trim();
      else delete k[x];
    }
  }
  await db.appSetting.upsert({ where: { key: "intel_keys" }, create: { key: "intel_keys", value: JSON.stringify(k) }, update: { value: JSON.stringify(k) } });
  await audit(admin, "integrations.edit", null, Object.keys(k).join(", "));
  return NextResponse.json({ ok: true });
}
