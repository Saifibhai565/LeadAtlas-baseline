import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";

// GET: Current global SMS gateway settings fetch karne ke liye
export async function GET() {
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return unauthorized();

  const settings = await db.appSetting.findMany({
    where: {
      key: { in: ["global_sms_url", "global_sms_method"] }
    }
  });

  const config: Record<string, string> = {};
  settings.forEach(s => { config[s.key] = s.value; });

  return NextResponse.json({
    ok: true,
    smsUrl: config.global_sms_url || "",
    smsMethod: config.global_sms_method || "GET"
  });
}

// POST: Global SMS gateway settings save karne ke liye
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return unauthorized();

  const body = await req.json().catch(() => ({}));
  const { smsUrl, smsMethod } = body;

  await db.$transaction([
    db.appSetting.upsert({
      where: { key: "global_sms_url" },
      update: { value: String(smsUrl || "") },
      create: { key: "global_sms_url", value: String(smsUrl || "") }
    }),
    db.appSetting.upsert({
      where: { key: "global_sms_method" },
      update: { value: String(smsMethod || "GET") },
      create: { key: "global_sms_method", value: String(smsMethod || "GET") }
    })
  ]);

  return NextResponse.json({ ok: true, message: "Global SMS Gateway settings saved successfully!" });
}