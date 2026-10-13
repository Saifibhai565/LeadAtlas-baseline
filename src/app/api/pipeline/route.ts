import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { rescoreMissing } from "@/lib/leads";

export const dynamic = "force-dynamic";

const STAGES = ["NEW", "CONTACTED", "INTERESTED", "WON", "LOST"] as const;
const PER_STAGE = 60;

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  await rescoreMissing(user.wsId, 300);

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const base = {
    userId: user.wsId,
    ...(q ? { OR: [{ title: { contains: q } }, { category: { contains: q } }, { address: { contains: q } }] } : {}),
  };

  const columns = await Promise.all(
    STAGES.map(async (stage) => {
      const where = { ...base, status: stage };
      const [items, count, value] = await Promise.all([
        db.lead.findMany({
          where,
          orderBy:
            stage === "NEW"
              ? [{ score: { sort: "desc" as const, nulls: "last" as const } }, { createdAt: "desc" as const }]
              : [{ updatedAt: "desc" as const }],
          take: PER_STAGE,
          select: {
            id: true,
            title: true,
            category: true,
            phone: true,
            score: true,
            followUpAt: true,
            dealValue: true,
            website: true,
            rating: true,
          },
        }),
        db.lead.count({ where }),
        db.lead.aggregate({ where, _sum: { dealValue: true } }),
      ]);
      return { stage, items, count, value: value._sum.dealValue ?? 0 };
    }),
  );

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const due = await db.lead.count({
    where: { userId: user.wsId, followUpAt: { lte: end }, status: { notIn: ["WON", "LOST"] } },
  });

  return NextResponse.json({ columns, due });
}
