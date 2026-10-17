import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./token";

export async function startSession(user: { id: string; role: string }) {
  const token = await signSession({ uid: user.id, role: user.role });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(IMPERSONATOR_COOKIE);
}

/** Admin support tool: keeps the admin's own session aside and signs in as someone else. */
export const IMPERSONATOR_COOKIE = "la_admin";

export async function startImpersonation(target: { id: string; role: string }) {
  const jar = await cookies();
  const adminToken = jar.get(SESSION_COOKIE)?.value;
  if (!adminToken) return;
  jar.set(IMPERSONATOR_COOKIE, adminToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  await startSession(target);
}

/** Returns to the admin's own account. Returns false if there was nothing to return to. */
export async function stopImpersonation() {
  const jar = await cookies();
  const adminToken = jar.get(IMPERSONATOR_COOKIE)?.value;
  const admin = await verifySession(adminToken);
  jar.delete(IMPERSONATOR_COOKIE);
  if (!admin || admin.role !== "ADMIN") return false;
  const stillAdmin = await db.user.findUnique({ where: { id: admin.uid }, select: { role: true, blocked: true } });
  if (!stillAdmin || stillAdmin.role !== "ADMIN" || stillAdmin.blocked) return false;
  await startSession({ id: admin.uid, role: "ADMIN" });
  return true;
}

/**
 * The signed-in person plus their workspace.
 *  - id:     the person (for "who did this", personal settings)
 *  - wsId:   the workspace owner's id — every lead, search and template belongs to this
 *  - credits/plan: the workspace's, shared by the whole team
 */
export async function currentUser() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const u = await db.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      blocked: true,
      credits: true,
      ownerId: true,
      emailVerifiedAt: true,
      planExpiresAt: true,
      plan: { select: { id: true, name: true, ai: true, api: true, outreach: true, whiteLabel: true, seats: true } },
      owner: {
        select: {
          blocked: true,
          credits: true,
          planExpiresAt: true,
          plan: { select: { id: true, name: true, ai: true, api: true, outreach: true, whiteLabel: true, seats: true } },
        },
      },
    },
  });
  if (!u || u.blocked || u.owner?.blocked) return null;

  const ws = u.owner ?? u;
  const planActive = Boolean(ws.plan && (!ws.planExpiresAt || ws.planExpiresAt > new Date()));
  const isAdmin = u.role === "ADMIN";
  const impersonator = await verifySession(jar.get(IMPERSONATOR_COOKIE)?.value);

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isAdmin,
    wsId: u.ownerId ?? u.id,
    isOwner: !u.ownerId,
    teamRole: (u.ownerId ? (u as unknown as { teamRole?: string }).teamRole : "OWNER") ?? "MEMBER",
    credits: ws.credits,
    planName: planActive ? ws.plan!.name : "Free",
    planExpiresAt: planActive ? ws.planExpiresAt : null,
    seats: planActive ? ws.plan!.seats : 1,
    canUseAI: isAdmin || (planActive && Boolean(ws.plan!.ai)),
    canUseAPI: isAdmin || (planActive && Boolean(ws.plan!.api)),
    canUseOutreach: isAdmin || (planActive && Boolean(ws.plan!.outreach)),
    canWhiteLabel: isAdmin || (planActive && Boolean(ws.plan!.whiteLabel)),
    emailVerified: Boolean(u.emailVerifiedAt),
    // Set while the admin is looking at the app as this person
    impersonating: Boolean(impersonator && impersonator.role === "ADMIN" && impersonator.uid !== u.id),
  };
}

/** For pages: sends visitors to /login when signed out. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
