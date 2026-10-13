import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { deliver } from "@/lib/webhooks";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const hook = await db.webhook.findFirst({ where: { id, userId: user.wsId } });
  if (!hook) return fail("Webhook not found.", 404);
  const status = await deliver(hook.id, hook.url, hook.secret, "test", { message: "This is a test event." });
  return NextResponse.json({ status });
}
