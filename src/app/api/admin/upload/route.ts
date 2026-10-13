import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { setSetting } from "@/lib/settings";

const TARGET = { logo: ["platform_logo", 400_000], favicon: ["platform_favicon", 150_000], og: ["og_image", 1_500_000] } as const;

/** POST { kind: "logo" | "favicon" | "og", dataUrl } — an empty dataUrl removes it. */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const t = TARGET[b?.kind as keyof typeof TARGET];
  if (!t) return fail("Unknown image.");
  const dataUrl = String(b?.dataUrl ?? "");
  if (dataUrl && !/^data:image\/(png|jpeg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon|gif);base64,/.test(dataUrl)) return fail("Use a PNG, JPG, WEBP, SVG, GIF or ICO image.");
  if (dataUrl.length > t[1]) return fail(`That image is too big. Keep it under ${Math.round((t[1] * 0.75) / 1000)} KB.`);
  await setSetting(t[0], dataUrl);
  await audit(admin, "branding.upload", null, `${b.kind}${dataUrl ? "" : " removed"}`);
  return NextResponse.json({ ok: true });
}
