import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { recordError } from "@/lib/errors";
import { allow, clientIp } from "@/lib/ratelimit";

/** The browser reports crashes here (from error screens and the global error listener). */
export async function POST(req: Request) {
  if (!allow(`cerr:${clientIp(req)}`, 30, 600_000)) return NextResponse.json({ ok: true });
  const b = await req.json().catch(() => ({}));
  const user = await currentUser().catch(() => null);
  await recordError({
    source: "BROWSER",
    message: String(b?.message ?? "Unknown browser error"),
    stack: b?.stack ? String(b.stack) : null,
    path: b?.path ? String(b.path).slice(0, 200) : null,
    userId: user?.id ?? null,
  });
  return NextResponse.json({ ok: true });
}
