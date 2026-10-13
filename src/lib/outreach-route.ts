import "server-only";
import type { CurrentUser } from "./auth";
import { fail } from "./http";

export function outreachBlocked(user: CurrentUser) {
  if (!user.canUseOutreach) return fail("Email outreach is part of the Pro and Agency plans. Upgrade on the Billing page.", 402);
  return null;
}
