import { apiAuth, apiJson, preflight } from "@/lib/apikey";
import { db } from "@/lib/db";

export const OPTIONS = preflight;

export async function GET(req: Request) {
  const auth = await apiAuth(req);
  if ("res" in auth) return auth.res;
  const u = await db.user.findUnique({ where: { id: auth.wsId }, select: { name: true, credits: true } });
  return apiJson({ account: u?.name, credits: u?.credits ?? 0 });
}
