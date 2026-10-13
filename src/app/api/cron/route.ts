import { NextResponse } from "next/server";
import { kickEnrichment } from "@/lib/enrich";
import { tick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

/**
 * For servers: call every 5 minutes so watches run even when nobody has the app open.
 *   curl -s "https://your-domain/api/cron?secret=YOUR_CRON_SECRET"
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || new URL(req.url).searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  await tick(true);
  kickEnrichment();
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
