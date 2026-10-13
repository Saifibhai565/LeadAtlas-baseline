import { db } from "@/lib/db";

// 1x1 transparent GIF
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.emailMessage.updateMany({ where: { id, openedAt: null, status: "SENT" }, data: { openedAt: new Date() } }).catch(() => undefined);
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, private" } });
}
