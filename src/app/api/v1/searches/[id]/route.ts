import { apiAuth, apiError, apiJson, preflight } from "@/lib/apikey";
import { db } from "@/lib/db";
import { syncActiveJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req);
  if ("res" in auth) return auth.res;
  await syncActiveJobs(auth.wsId).catch(() => undefined);
  const { id } = await params;
  const j = await db.job.findFirst({ where: { id, userId: auth.wsId } });
  if (!j) return apiError("Search not found.", 404);
  return apiJson({
    data: {
      id: j.id,
      name: j.name,
      keywords: JSON.parse(j.keywords),
      status: j.status.toLowerCase(),
      found: j.resultCount,
      newLeads: j.newCount,
      error: j.error,
      createdAt: j.createdAt,
      finishedAt: j.finishedAt,
    },
  });
}
