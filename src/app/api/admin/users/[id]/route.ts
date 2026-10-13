import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Everything about one user, for the admin's user page. */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await apiAdmin())) return forbidden();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      blocked: true,
      credits: true,
      businessName: true,
      offer: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      emailAlerts: true,
      planExpiresAt: true,
      ownerId: true,
      owner: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true } },
      members: { select: { id: true, name: true, email: true, blocked: true, lastLoginAt: true }, orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 10, include: { plan: { select: { name: true } } } },
    },
  });
  if (!user) return fail("User not found.", 404);

  const ws = user.ownerId ?? user.id;
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [leads, leadsWeek, searches, watches, messages, lastSearch] = await Promise.all([
    db.lead.count({ where: { userId: ws } }),
    db.lead.count({ where: { userId: ws, createdAt: { gte: weekAgo } } }),
    db.job.count({ where: { userId: ws } }),
    db.watch.count({ where: { userId: ws } }),
    db.activity.count({ where: { userId: user.id, type: "MESSAGE" } }),
    db.job.findFirst({ where: { userId: ws }, orderBy: { createdAt: "desc" }, select: { name: true, createdAt: true } }),
  ]);
  return NextResponse.json({ user, stats: { leads, leadsWeek, searches, watches, messages, lastSearch } });
}

/**
 * PATCH { name?, email?, role?, blocked?, verified?, addCredits?, setCredits?, planId?, planDays?, planExpiresAt?, resetPassword? }
 * resetPassword: true returns a new temporary password to give to the user.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("User not found.", 404);

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  let tempPassword: string | null = null;

  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (name.length < 2) return fail("Enter a name.");
    data.name = name.slice(0, 80);
  }
  if (b.email !== undefined) {
    const email = String(b.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
    if (email !== target.email) {
      if (await db.user.findUnique({ where: { email } })) return fail("Another account already uses that email.");
      data.email = email;
      data.emailVerifiedAt = null; // the new address hasn't been confirmed
    }
  }
  if (b.role !== undefined) {
    if (!["USER", "ADMIN"].includes(b.role)) return fail("Unknown role.");
    if (id === admin.id && b.role !== "ADMIN") return fail("You can't remove your own admin role.");
    if (b.role === "ADMIN" && target.ownerId) return fail("Team members can't be admins. Only account owners can.");
    data.role = b.role;
  }
  if (typeof b.blocked === "boolean") {
    if (id === admin.id) return fail("You can't block your own account.");
    data.blocked = b.blocked;
  }
  if (typeof b.verified === "boolean") data.emailVerifiedAt = b.verified ? target.emailVerifiedAt ?? new Date() : null;
  if (b.setCredits != null) {
    const n = Math.round(Number(b.setCredits));
    if (!Number.isFinite(n) || n < 0) return fail("Credits must be 0 or more.");
    data.credits = n;
  } else if (b.addCredits != null) {
    const n = Math.round(Number(b.addCredits));
    if (!Number.isFinite(n) || n === 0) return fail("Enter a number of credits, like 1000 or -500.");
    data.credits = { increment: n };
  }
  if (b.planId !== undefined) {
    if (target.ownerId) return fail("Plans belong to the account owner, not team members.");
    if (b.planId === null || b.planId === "") {
      data.planId = null;
      data.planExpiresAt = null;
    } else {
      const plan = await db.plan.findUnique({ where: { id: String(b.planId) } });
      if (!plan) return fail("Plan not found.");
      data.planId = plan.id;
      if (b.planExpiresAt) {
        const d = new Date(b.planExpiresAt);
        if (Number.isNaN(d.getTime())) return fail("Pick a valid end date.");
        data.planExpiresAt = d;
      } else {
        const days = Math.max(1, Math.min(3650, Math.round(Number(b.planDays ?? 30))));
        data.planExpiresAt = new Date(Date.now() + days * 86400000);
      }
    }
  }
  if (b.newPassword) {
    const pw = String(b.newPassword);
    if (pw.length < 8) return fail("The new password needs at least 8 characters.");
    data.passwordHash = await bcrypt.hash(pw, 10);
  }
  if (b.businessName !== undefined) data.businessName = String(b.businessName).trim().slice(0, 120) || null;
  if (b.offer !== undefined) data.offer = String(b.offer).trim().slice(0, 1000) || null;
  if (b.resetPassword === true) {
    tempPassword = randomBytes(6).toString("base64url");
    data.passwordHash = await bcrypt.hash(tempPassword, 10);
  }

  await db.user.update({ where: { id }, data });
  const changed = Object.keys(data).map((k) => (k === "passwordHash" ? "password reset" : k));
  await audit(admin, "user.edit", { type: "user", id }, `${target.email}: ${changed.join(", ")}`);
  return NextResponse.json({ ok: true, tempPassword });
}

/** Deletes a user. An owner takes their whole workspace with them. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const { id } = await params;
  if (id === admin.id) return fail("You can't delete your own account.");
  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) return fail("User not found.", 404);
  await audit(admin, "user.delete", { type: "user", id }, target.email);
  await db.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
