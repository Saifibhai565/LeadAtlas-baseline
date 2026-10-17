import "server-only";

/** Team roles decide what a member can do inside a workspace. */
export type TeamRole = "OWNER" | "MANAGER" | "MEMBER";

export const ROLE_LABEL: Record<TeamRole, string> = { OWNER: "Owner", MANAGER: "Manager", MEMBER: "Member" };

/** Fine-grained permissions. The platform Super Admin always passes. */
export function can(user: { isAdmin: boolean; isOwner: boolean; teamRole?: string }, action: "billing" | "team" | "settings" | "integrations" | "delete_leads" | "export") {
  if (user.isAdmin) return true;
  const role = (user.teamRole as TeamRole) ?? (user.isOwner ? "OWNER" : "MEMBER");
  switch (action) {
    case "billing":
    case "settings":
    case "integrations":
      return role === "OWNER";
    case "team":
    case "delete_leads":
    case "export":
      return role === "OWNER" || role === "MANAGER";
    default:
      return true;
  }
}

/** Does an IP match the owner's allow-list (exact IPs or "203.0.113." prefixes)? Empty list = everyone allowed. */
export function ipAllowed(ip: string | null, allow: string | null) {
  const rules = (allow ?? "").split(",").map((r) => r.trim()).filter(Boolean);
  if (rules.length === 0) return true;
  if (!ip) return false;
  return rules.some((r) => (r.includes("/") ? ip.startsWith(r.split("/")[0].split(".").slice(0, 3).join(".")) : ip === r || ip.startsWith(r.endsWith(".") ? r : `${r}.`) || ip === r));
}

const BR = "\u2588";
/** Masks personal data for a privacy export/view. "ahmed@x.com" -> "a••••@x.com" */
export function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return BR.repeat(e.length);
  return `${u[0] ?? ""}${BR.repeat(Math.max(2, u.length - 1))}@${d}`;
}
export function maskPhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length > 4 ? `${BR.repeat(d.length - 4)}${d.slice(-4)}` : BR.repeat(d.length);
}
