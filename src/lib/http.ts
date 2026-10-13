import { NextResponse } from "next/server";
import { currentUser } from "./auth";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const apiUser = currentUser;

export function unauthorized() {
  return fail("Your session has ended. Sign in again.", 401);
}

/** For admin API routes: returns the admin, or null (send `forbidden()`). */
export async function apiAdmin() {
  const user = await currentUser();
  return user?.isAdmin ? user : null;
}

export function forbidden() {
  return fail("Only the platform admin can do this.", 403);
}
