import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { createSearch, SearchError } from "@/lib/searches";

function city(address: string | null) {
  const parts = (address ?? "").split(",").map((p) => p.trim()).filter((p) => p && !/^(pakistan|\d{4,6})$/i.test(p));
  return parts.length ? parts[parts.length - 1].replace(/\s*\d{4,6}$/, "") : null;
}

/** POST — finds more businesses like the ones you've won: same kinds, same cities. */
export async function POST() {
  const user = await apiUser();
  if (!user) return unauthorized();
  const won = await db.lead.findMany({ where: { userId: user.wsId, status: "WON", category: { not: null } }, select: { category: true, address: true }, take: 500 });
  if (won.length < 2) return fail("Mark at least 2 leads as Won first, so we know what your best clients look like.");
  const count = <T,>(arr: T[]) => {
    const m = new Map<T, number>();
    for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
    return Array.from(m).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const cats = count(won.map((w) => w.category as string)).slice(0, 3);
  const cities = count(won.map((w) => city(w.address)).filter((c): c is string => Boolean(c))).slice(0, 3);
  if (!cities.length) return fail("Your won leads have no city in their address.");
  const keywords = cats.flatMap((c) => cities.map((ci) => `${c} in ${ci}`));
  try {
    const job = await createSearch(user.wsId, { keywords, name: "More like my best clients", depth: 2, autoCheck: true });
    return NextResponse.json({ job: { id: job.id }, keywords });
  } catch (err) {
    if (err instanceof SearchError) return fail(err.message, err.status);
    throw err;
  }
}
