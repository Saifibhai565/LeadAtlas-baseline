import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const KEYS = { logo: "platform_logo", favicon: "platform_favicon", og: "og_image" } as const;

/** Serves the logo, favicon and share image the Super Admin uploaded (stored as data URLs). */
export async function GET(_req: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  const key = KEYS[asset.replace(/\.\w+$/, "") as keyof typeof KEYS];
  if (!key) return new Response("Not found", { status: 404 });
  const value = await getSetting(key);
  const m = value.match(/^data:(image\/(png|jpeg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon|gif));base64,(.+)$/);
  if (!m) return new Response("Not set", { status: 404 });
  return new Response(Buffer.from(m[3], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=300",
      ...(m[1] === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}
