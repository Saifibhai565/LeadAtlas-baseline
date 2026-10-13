import { apiAuth, apiError, apiJson, preflight } from "@/lib/apikey";
import { db } from "@/lib/db";
import { createSearch, SearchError } from "@/lib/searches";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

function shape(j: { id: string; name: string; keywords: string; status: string; resultCount: number; newCount: number; error: string | null; createdAt: Date; finishedAt: Date | null }) {
  return {
    id: j.id,
    name: j.name,
    keywords: JSON.parse(j.keywords) as string[],
    status: j.status.toLowerCase(),
    found: j.resultCount,
    newLeads: j.newCount,
    error: j.error,
    createdAt: j.createdAt,
    finishedAt: j.finishedAt,
  };
}

export async function GET(req: Request) {
  const auth = await apiAuth(req);
  if ("res" in auth) return auth.res;
  const jobs = await db.job.findMany({ where: { userId: auth.wsId }, orderBy: { createdAt: "desc" }, take: 50 });
  return apiJson({ data: jobs.map(shape) });
}

/** POST { keywords: string[], name?, depth?, lang?, check? } */
export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if ("res" in auth) return auth.res;
  const b = await req.json().catch(() => ({}));
  try {
    const job = await createSearch(auth.wsId, {
      keywords: Array.isArray(b?.keywords) ? b.keywords : String(b?.keywords ?? ""),
      name: b?.name,
      depth: b?.depth,
      lang: b?.lang,
      autoCheck: b?.check !== false,
    });
    const row = await db.job.findUnique({ where: { id: job.id } });
    return apiJson({ data: shape(row!) }, 201);
  } catch (err) {
    if (err instanceof SearchError) return apiError(err.message, err.status);
    throw err;
  }
}
