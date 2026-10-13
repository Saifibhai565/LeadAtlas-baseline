import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { syncActiveJobs } from "@/lib/jobs";
import { tick } from "@/lib/scheduler";
import { createSearch, SearchError } from "@/lib/searches";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();

  const { engineOnline } = await syncActiveJobs(user.wsId);
  tick().catch(() => undefined);
  const jobs = await db.job.findMany({
    where: { userId: user.wsId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const fresh = await db.user.findUnique({ where: { id: user.wsId }, select: { credits: true } });

  return NextResponse.json({
    engineOnline,
    credits: fresh?.credits ?? 0,
    jobs: jobs.map((j) => ({ ...j, keywords: JSON.parse(j.keywords) as string[] })),
  });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try {
    const job = await createSearch(user.wsId, {
      keywords: String(body?.keywords ?? ""),
      name: body?.name,
      lang: body?.lang,
      depth: body?.depth,
      maxTime: body?.maxTime,
      zoom: body?.zoom,
      withEmails: Boolean(body?.withEmails),
      autoCheck: Boolean(body?.autoCheck),
      extraReviews: Boolean(body?.extraReviews),
      goal: Number(body?.goal) > 0 ? Number(body.goal) : null,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    if (err instanceof SearchError) return fail(err.message, err.status);
    throw err;
  }
}
