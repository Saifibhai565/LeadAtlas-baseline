import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Serves a published website. Scripts are blocked by the security policy. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await db.site.findUnique({ where: { slug } });
  if (!site || !site.published) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  db.site.update({ where: { id: site.id }, data: { views: { increment: 1 } } }).catch(() => undefined);
  return new Response(site.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src * data:; font-src data:; frame-ancestors 'self'",
      "Cache-Control": "public, max-age=60",
    },
  });
}
