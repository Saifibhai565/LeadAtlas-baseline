import { NextResponse } from "next/server";
import { enginePing } from "@/lib/engine";
import { apiUser, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  return NextResponse.json({ online: await enginePing() });
}
