import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Downloads everything stored for this account as JSON. Owners get the whole workspace. */
export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, businessName: true, offer: true, signature: true, createdAt: true },
  });
  const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), profile };

  if (user.isOwner) {
    const ws = user.wsId;
    const [leads, searches, templates, watches, views, payments, activities] = await Promise.all([
      db.lead.findMany({ where: { userId: ws } }),
      db.job.findMany({ where: { userId: ws } }),
      db.template.findMany({ where: { userId: ws } }),
      db.watch.findMany({ where: { userId: ws } }),
      db.savedView.findMany({ where: { userId: ws } }),
      db.payment.findMany({ where: { userId: ws } }),
      db.activity.findMany({ where: { lead: { userId: ws } } }),
    ]);
    Object.assign(data, { leads, searches, templates, watches, savedViews: views, payments, activities });
  } else {
    data.activities = await db.activity.findMany({ where: { userId: user.id } });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-data-${stamp}.json"`,
    },
  });
}
