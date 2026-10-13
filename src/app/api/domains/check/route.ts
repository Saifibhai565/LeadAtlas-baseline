import { ownerForDomain } from "@/lib/brand";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Caddy asks this before getting an SSL certificate for a new domain (on-demand TLS).
 * 200 = it's a white-label domain we serve; anything else = refuse.
 */
export async function GET(req: Request) {
  const domain = new URL(req.url).searchParams.get("domain")?.toLowerCase().trim();
  if (!domain) return new Response("missing", { status: 400 });
  const owner = await ownerForDomain(domain);
  const site = owner ? null : await db.site.findUnique({ where: { customDomain: domain }, select: { published: true } });
  const ok = Boolean(owner || site?.published);
  return new Response(ok ? "ok" : "unknown", { status: ok ? 200 : 404 });
}
