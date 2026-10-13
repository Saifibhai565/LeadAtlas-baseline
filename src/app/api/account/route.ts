import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { endSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";

/**
 * DELETE { password } — deletes the account for good.
 * Owners: removes the whole workspace (leads, searches, team members, everything).
 * Members: removes just their sign-in; their notes stay with the team.
 */
export async function DELETE(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (user.isAdmin) return fail("The platform admin account can't be deleted from here.", 403);

  const b = await req.json().catch(() => ({}));
  const me = await db.user.findUnique({ where: { id: user.id } });
  if (!me || !(await bcrypt.compare(String(b?.password ?? ""), me.passwordHash))) {
    return fail("Your password is incorrect.", 401);
  }

  if (user.isOwner) {
    await db.user.delete({ where: { id: user.id } }); // cascades to everything in the workspace
  } else {
    // Keep the team's history readable: anonymise instead of deleting the row
    await db.user.update({
      where: { id: user.id },
      data: { blocked: true, name: "Former member", email: `deleted-${user.id}@invalid`, passwordHash: "-" },
    });
    await db.lead.updateMany({ where: { assignedToId: user.id }, data: { assignedToId: null } });
  }
  await endSession();
  return NextResponse.json({ ok: true });
}
