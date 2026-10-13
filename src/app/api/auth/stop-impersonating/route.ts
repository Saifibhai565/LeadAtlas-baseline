import { NextResponse } from "next/server";
import { stopImpersonation } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST() {
  const ok = await stopImpersonation();
  if (!ok) return fail("Your admin session has ended. Sign in again.", 401);
  return NextResponse.json({ ok: true });
}
