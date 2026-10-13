import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { FEATURES, type FeatureConfig } from "@/lib/feature-list";
import { getFeatureConfig } from "@/lib/features";
import { apiAdmin, forbidden } from "@/lib/http";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const [config, plans] = await Promise.all([getFeatureConfig(), db.plan.findMany({ orderBy: { sort: "asc" }, select: { id: true, name: true } })]);
  return NextResponse.json({ features: FEATURES, config, plans });
}

/** PATCH { config: { [key]: { on, plans[] } } } */
export async function PATCH(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const clean: FeatureConfig = {};
  for (const f of FEATURES) {
    const c = b?.config?.[f.key];
    if (!c) continue;
    clean[f.key] = { on: Boolean(c.on), plans: Array.isArray(c.plans) ? c.plans.map(String).slice(0, 50) : [] };
  }
  await db.appSetting.upsert({ where: { key: "features" }, create: { key: "features", value: JSON.stringify(clean) }, update: { value: JSON.stringify(clean) } });
  await audit(admin, "features.edit", null, Object.entries(clean).map(([k, v]) => `${k}:${v.on ? (v.plans.length ? v.plans.length + " plans" : "all") : "off"}`).join(", "));
  return NextResponse.json({ ok: true });
}
