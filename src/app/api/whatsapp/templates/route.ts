import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { waTemplates } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Approved message templates from Meta. */
export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const acc = await db.waAccount.findUnique({ where: { userId: user.wsId } });
  if (!acc) return fail("Connect WhatsApp first.", 404);
  try {
    return NextResponse.json({ templates: await waTemplates(acc) });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Couldn't load templates.", 502);
  }
}
