import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { apiAdmin, fail, forbidden } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const show = new URL(req.url).searchParams.get("show") ?? "pending";
  const templates = await db.marketTemplate.findMany({
    where: show === "pending" ? { approved: false } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const pending = await db.marketTemplate.count({ where: { approved: false } });
  return NextResponse.json({ templates, pending });
}

/** POST — create an official platform template. */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim().slice(0, 80);
  const body = String(b?.body ?? "").trim();
  const channel = ["WHATSAPP", "EMAIL", "SMS", "SEQUENCE"].includes(b?.channel) ? b.channel : "WHATSAPP";
  if (!name || !body) return fail("Name and message are required.");
  const t = await db.marketTemplate.create({
    data: {
      authorName: String(b?.authorName ?? "Team").slice(0, 40),
      official: true,
      approved: true,
      name,
      category: String(b?.category ?? "General").slice(0, 40),
      channel,
      language: String(b?.language ?? "english"),
      subject: b?.subject ? String(b.subject).slice(0, 200) : null,
      body,
    },
  });
  await audit(admin, "marketplace.create", { type: "marketTemplate", id: t.id }, name);
  return NextResponse.json({ id: t.id }, { status: 201 });
}
