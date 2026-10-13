import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { sanitizeHtml } from "@/lib/sanitize";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const site = await db.site.findFirst({ where: { id, userId: user.wsId } });
  if (!site) return fail("Not found.", 404);
  return NextResponse.json({ site, target: process.env.WHITELABEL_TARGET || null });
}

/** PATCH { name?, slug?, html?, published?, customDomain? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const site = await db.site.findFirst({ where: { id, userId: user.wsId } });
  if (!site) return fail("Not found.", 404);
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 80) || site.name;
  if (b.slug !== undefined) {
    const slug = String(b.slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    if (slug.length < 3) return fail("The address needs at least 3 letters or numbers.");
    const taken = await db.site.findUnique({ where: { slug } });
    if (taken && taken.id !== id) return fail("That address is taken.");
    data.slug = slug;
  }
  if (typeof b.html === "string") data.html = sanitizeHtml(b.html).slice(0, 300_000);
  if (typeof b.published === "boolean") data.published = b.published;
  if (b.customDomain !== undefined) {
    const d = String(b.customDomain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (d) {
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d)) return fail("Enter a domain like www.business.com.");
      const taken = (await db.site.findUnique({ where: { customDomain: d } })) || (await db.user.findUnique({ where: { customDomain: d } }));
      if (taken && taken.id !== id) return fail("That domain is already used.");
    }
    data.customDomain = d || null;
  }
  await db.site.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.site.deleteMany({ where: { id, userId: user.wsId } });
  return NextResponse.json({ ok: true });
}
