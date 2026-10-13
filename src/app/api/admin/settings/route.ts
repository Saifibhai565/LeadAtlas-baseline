import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { getLightSettings, setSetting, SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  return NextResponse.json({ settings: await getLightSettings() });
}

export async function PATCH(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    if (b[key] === undefined) continue;
    if (["platform_logo", "platform_favicon", "og_image"].includes(key)) continue; // images go through /api/admin/upload
    const value = String(b[key]).slice(0, 8000);
    if ((key === "signup_credits" || key === "referral_credits") && !(Number(value) >= 0)) return fail("Credits must be 0 or more.");
    await setSetting(key, value);
  }
  await audit(admin, "settings.edit", null, Object.keys(b).join(", "));
  return NextResponse.json({ ok: true });
}
