import "server-only";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { FEATURES, type FeatureConfig } from "./feature-list";

export async function getFeatureConfig(): Promise<FeatureConfig> {
  const row = await db.appSetting.findUnique({ where: { key: "features" } });
  try {
    return row ? (JSON.parse(row.value) as FeatureConfig) : {};
  } catch {
    return {};
  }
}

/** Feature keys this person can see. The Super Admin always sees everything. */
export async function allowedFeatures(user: CurrentUser): Promise<string[]> {
  if (user.isAdmin) return FEATURES.map((f) => f.key);
  const cfg = await getFeatureConfig();
  const ws = await db.user.findUnique({ where: { id: user.wsId }, select: { planId: true, planExpiresAt: true } });
  const planId = ws?.planId && (!ws.planExpiresAt || ws.planExpiresAt > new Date()) ? ws.planId : "free";
  return FEATURES.filter((f) => {
    const c = cfg[f.key];
    if (!c) return true;
    if (!c.on) return false;
    return c.plans.length === 0 || c.plans.includes(planId);
  }).map((f) => f.key);
}
