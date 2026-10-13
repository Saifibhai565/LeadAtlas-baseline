import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { APP_NAME } from "./utils";
import { getSettings } from "./settings";

export type Brand = { name: string; color: string | null; custom: boolean; ownerId: string | null };

const DEFAULT: Brand = { name: APP_NAME, color: null, custom: false, ownerId: null };
const cache = new Map<string, { brand: Brand; at: number }>();

function mainHost() {
  try {
    return new URL(process.env.APP_URL || "http://localhost:3000").host.toLowerCase();
  } catch {
    return "localhost:3000";
  }
}

/** The owner whose white-label domain this is, if their plan still allows it. */
export async function ownerForDomain(domain: string) {
  const owner = await db.user.findUnique({
    where: { customDomain: domain.toLowerCase() },
    select: { id: true, blocked: true, role: true, brandName: true, businessName: true, brandColor: true, planExpiresAt: true, plan: { select: { whiteLabel: true } } },
  });
  if (!owner || owner.blocked) return null;
  const allowed = owner.role === "ADMIN" || (owner.plan?.whiteLabel && (!owner.planExpiresAt || owner.planExpiresAt > new Date()));
  return allowed ? owner : null;
}

/** Brand for the current request's domain. Cached for a minute. */
export async function currentBrand(): Promise<Brand> {
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  if (!host || host === mainHost() || host.startsWith("localhost") || host.startsWith("127.")) return platformBrand();
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < 60_000) return hit.brand;
  const owner = await ownerForDomain(host.replace(/:\d+$/, ""));
  // Hosted client websites are not app domains
  if (!owner && (await db.site.findUnique({ where: { customDomain: host.replace(/:\d+$/, "") }, select: { id: true } }))) return platformBrand();
  const brand: Brand = owner
    ? { name: owner.brandName || owner.businessName || APP_NAME, color: owner.brandColor, custom: true, ownerId: owner.id }
    : await platformBrand();
  cache.set(host, { brand, at: Date.now() });
  return brand;
}

/** "#2563EB" -> "37 99 235" for the CSS colour variables. */
export function hexToRgbVar(hex: string | null) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
}

let platformCache: { brand: Brand; at: number } | null = null;
/** The platform's own name and colour, set by the Super Admin. */
export async function platformBrand(): Promise<Brand> {
  if (platformCache && Date.now() - platformCache.at < 30_000) return platformCache.brand;
  const s = await getSettings().catch(() => null);
  const brand: Brand = { ...DEFAULT, name: s?.platform_name || APP_NAME, color: s?.platform_color || null };
  platformCache = { brand, at: Date.now() };
  return brand;
}
