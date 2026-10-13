import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enginePing } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  try {
    await db.$queryRawUnsafe("SELECT 1");
    database = true;
  } catch {
    database = false;
  }
  const engine = await enginePing();
  return NextResponse.json({ ok: database, database, engine }, { status: database ? 200 : 503 });
}
