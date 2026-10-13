import "server-only";
import { db } from "./db";

/** Records an admin action. Never throws. */
export async function audit(
  actor: { id: string; email: string },
  action: string,
  target?: { type: string; id: string } | null,
  detail?: string,
) {
  await db.auditLog
    .create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        detail: detail?.slice(0, 1000) ?? null,
      },
    })
    .catch(() => undefined);
}
