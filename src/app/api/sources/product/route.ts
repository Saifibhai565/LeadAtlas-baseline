import { NextResponse } from "next/server";
import { AI_ENABLED, callClaude, parseJson } from "@/lib/ai";
import { apiUser, fail, unauthorized } from "@/lib/http";
import { createSearch, SearchError } from "@/lib/searches";

/**
 * POST { product, intent: "sell" | "buy", cities: string, goal? }
 * "sell": find businesses that could stock or use your product (your customers).
 * "buy":  find businesses that sell or supply it (your suppliers).
 * Turns the product into the right kinds of business, then runs a Google Maps search with a lead goal.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const product = String(b?.product ?? "").trim().slice(0, 80);
  const intent = b?.intent === "buy" ? "buy" : "sell";
  const cities = String(b?.cities ?? "")
    .split(/[,\n]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 6);
  if (product.length < 2) return fail("Type the product, like “hair oil”.");
  if (cities.length === 0) return fail("Add at least one city.");

  let types: string[] = [];
  if (AI_ENABLED && user.canUseAI) {
    try {
      const out = parseJson<{ types: string[] }>(
        await callClaude(
          `List the kinds of local business, as people search for them on Google Maps, that ${
            intent === "sell" ? "would BUY or RESELL this product (stockists, shops, salons, clinics that use it, distributors)" : "SELL or SUPPLY this product (shops, wholesalers, distributors, manufacturers)"
          }. Short English search terms, most likely first, at most 6. Reply ONLY with JSON: {"types": ["..."]}`,
          `Product: ${product}`,
          300,
        ),
      );
      types = (out.types ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 6);
    } catch {
      types = [];
    }
  }
  if (types.length === 0) {
    types = intent === "sell" ? [`${product} shop`, `${product} wholesale`, `${product} distributor`] : [`${product} supplier`, `${product} wholesale`, `${product} manufacturer`];
  }
  const keywords = types.flatMap((t) => cities.map((c) => `${t} in ${c}`)).slice(0, 36);
  try {
    const job = await createSearch(user.wsId, {
      keywords,
      name: `${intent === "sell" ? "Buyers" : "Suppliers"} for ${product}`,
      depth: 3,
      autoCheck: true,
      goal: Number(b?.goal) > 0 ? Number(b.goal) : null,
    });
    return NextResponse.json({ job: { id: job.id }, types, keywords });
  } catch (err) {
    if (err instanceof SearchError) return fail(err.message, err.status);
    throw err;
  }
}
