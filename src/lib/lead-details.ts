/**
 * Everything extra Google Maps gives us about a business, kept together in Lead.details (JSON).
 * Also the shared check that throws away placeholder emails like user@domain.com.
 */
const BAD_EMAIL =
  /\.(png|jpe?g|gif|webp|svg|css|js)$|@(example|sentry|wixpress|domain|email|test|yourdomain|company|website)\.|^(name|your|user|email|info@example|test|admin@example|someone|john\.?doe|jane\.?doe)@|@\d+x\./i;

export function cleanEmails(list: string[]) {
  return Array.from(new Set(list.map((e) => e.trim().toLowerCase()))).filter((e) => e.length < 80 && !BAD_EMAIL.test(e));
}

type Row = Record<string, string | undefined>;

function parse<T>(v: string | undefined): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}
const txt = (v: string | undefined) => (v && v.trim() && v.trim() !== "null" ? v.trim() : null);

export type LeadDetails = {
  owner?: { name?: string; link?: string; id?: string } | null;
  status?: string | null;
  plusCode?: string | null;
  timezone?: string | null;
  cid?: string | null;
  placeId?: string | null;
  dataId?: string | null;
  reviewsLink?: string | null;
  menu?: string | null;
  reservations?: { link: string; source?: string }[];
  orderOnline?: { link: string; source?: string }[];
  images?: string[];
  imageCount?: number | null;
  about?: { group: string; items: string[] }[];
  address?: { street?: string; borough?: string; city?: string; postal?: string; state?: string; country?: string } | null;
};

function links(v: unknown): { link: string; source?: string }[] {
  if (!Array.isArray(v)) return [];
  const out: { link: string; source?: string }[] = [];
  for (const x of v) {
    const o = (x ?? {}) as Record<string, string>;
    const link = typeof x === "string" ? x : o.link ?? o.url ?? "";
    if (link && /^https?:\/\//.test(link)) out.push({ link, source: o.source ?? o.name });
    if (out.length >= 6) break;
  }
  return out;
}

/** Pulls every useful extra column from the scraper's CSV row. Unknown or empty columns are skipped. */
export function mapsDetails(row: Row): string | null {
  const owner = parse<{ id?: string; name?: string; link?: string }>(row.owner);
  const addr = parse<{ street?: string; borough?: string; city?: string; postal_code?: string; state?: string; country?: string }>(row.complete_address);
  const about = parse<{ id?: string; name?: string; options?: { name?: string; enabled?: boolean }[] }[]>(row.about);
  const imgs = parse<{ image?: string; title?: string }[]>(row.images);
  const menu = parse<{ link?: string }>(row.menu);
  const d: LeadDetails = {
    owner: owner && (owner.name || owner.link) ? { name: owner.name, link: owner.link, id: owner.id } : null,
    status: txt(row.status),
    plusCode: txt(row.plus_code),
    timezone: txt(row.timezone),
    cid: txt(row.cid),
    placeId: txt(row.place_id),
    dataId: txt(row.data_id),
    reviewsLink: txt(row.reviews_link),
    menu: menu?.link ?? (txt(row.menu)?.startsWith("http") ? txt(row.menu) : null),
    reservations: links(parse(row.reservations)),
    orderOnline: links(parse(row.order_online)),
    images: (imgs ?? []).map((i) => i.image).filter((u): u is string => Boolean(u && u.startsWith("http"))).slice(0, 6),
    imageCount: imgs ? imgs.length : null,
    about: (about ?? [])
      .map((g) => ({ group: g.name ?? "", items: (g.options ?? []).filter((o) => o.enabled !== false && o.name).map((o) => o.name!) }))
      .filter((g) => g.group && g.items.length)
      .slice(0, 12),
    address: addr ? { street: addr.street, borough: addr.borough, city: addr.city, postal: addr.postal_code, state: addr.state, country: addr.country } : null,
  };
  const clean = Object.fromEntries(Object.entries(d).filter(([, v]) => v != null && !(Array.isArray(v) && v.length === 0)));
  return Object.keys(clean).length ? JSON.stringify(clean).slice(0, 20000) : null;
}
