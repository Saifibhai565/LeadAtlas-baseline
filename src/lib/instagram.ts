import "server-only";
import { decrypt } from "./crypto";
import { db } from "./db";

const VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export function igUsername(socialsJson: string | null): string | null {
  try {
    const url = socialsJson ? (JSON.parse(socialsJson) as Record<string, string>).instagram : null;
    const m = url?.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Public numbers of another business account, via the official Business Discovery API. */
export async function igLookup(igUserId: string, token: string, username: string) {
  const fields = `business_discovery.username(${username}){username,name,followers_count,media_count,biography,website}`;
  const res = await fetch(`https://graph.facebook.com/${VERSION}/${igUserId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const b = (await res.json().catch(() => ({}))) as { business_discovery?: { followers_count?: number; media_count?: number; name?: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(b.error?.message ?? `Instagram answered ${res.status}`);
  return b.business_discovery ?? null;
}

/** Updates a lead's Instagram numbers if the workspace has Instagram connected. Returns null when it can't. */
export async function refreshInstagram(leadId: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, userId: true, socials: true } });
  if (!lead) return null;
  const username = igUsername(lead.socials);
  if (!username) return null;
  const owner = await db.user.findUnique({ where: { id: lead.userId }, select: { igUserId: true, igTokenEnc: true } });
  if (!owner?.igUserId || !owner.igTokenEnc) return null;
  const d = await igLookup(owner.igUserId, decrypt(owner.igTokenEnc), username);
  if (!d) return null;
  await db.lead.update({
    where: { id: lead.id },
    data: { igFollowers: d.followers_count ?? null, igPosts: d.media_count ?? null, igCheckedAt: new Date() },
  });
  return d;
}
