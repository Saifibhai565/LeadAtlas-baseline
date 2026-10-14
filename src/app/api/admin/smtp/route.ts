import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

// GET: Current global SMTP settings fetch karne ke liye
export async function GET() {
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return unauthorized();

  const settings = await db.appSetting.findMany({
    where: {
      key: { in: ["global_smtp_host", "global_smtp_port", "global_smtp_user", "global_smtp_pass", "global_smtp_from_name", "global_smtp_from_email"] }
    }
  });

  const config: Record<string, string> = {};
  settings.forEach(s => { config[s.key] = s.value; });

  return NextResponse.json({ ok: true, config });
}

// POST: Global SMTP settings save karne ke liye
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return unauthorized();

  const body = await req.json().catch(() => ({}));
  const { host, port, user: smtpUser, pass, fromName, fromEmail } = body;

  const updates = [
    db.appSetting.upsert({ where: { key: "global_smtp_host" }, update: { value: String(host || "") }, create: { key: "global_smtp_host", value: String(host || "") } }),
    db.appSetting.upsert({ where: { key: "global_smtp_port" }, update: { value: String(port || "587") }, create: { key: "global_smtp_port", value: String(port || "587") } }),
    db.appSetting.upsert({ where: { key: "global_smtp_user" }, update: { value: String(smtpUser || "") }, create: { key: "global_smtp_user", value: String(smtpUser || "") } }),
    db.appSetting.upsert({ where: { key: "global_smtp_pass" }, update: { value: String(pass || "") }, create: { key: "global_smtp_pass", value: String(pass || "") } }),
    db.appSetting.upsert({ where: { key: "global_smtp_from_name" }, update: { value: String(fromName || "") }, create: { key: "global_smtp_from_name", value: String(fromName || "") } }),
    db.appSetting.upsert({ where: { key: "global_smtp_from_email" }, update: { value: String(fromEmail || "") }, create: { key: "global_smtp_from_email", value: String(fromEmail || "") } }),
  ];

  await db.$transaction(updates);

  return NextResponse.json({ ok: true, message: "Global SMTP settings saved successfully!" });
}