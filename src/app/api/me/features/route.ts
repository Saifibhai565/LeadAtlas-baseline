import { NextResponse } from "next/server";
import { allowedFeatures } from "@/lib/features";
import { apiUser, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  return NextResponse.json({ features: await allowedFeatures(user) });
}
