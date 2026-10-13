/** Everything the Super Admin can show or hide, per plan. Leads, dashboard, billing and settings are always on. */
export const FEATURES = [
  { key: "searches", label: "Google Maps searches", path: "/searches" },
  { key: "watches", label: "Watches", path: "/watches" },
  { key: "enrich", label: "Website checks", path: "/enrich" },
  { key: "extract", label: "Web extractor", path: "/extract" },
  { key: "osm", label: "OpenStreetMap search", path: null },
  { key: "pipeline", label: "Pipeline", path: "/pipeline" },
  { key: "inbox", label: "WhatsApp inbox", path: "/inbox" },
  { key: "campaigns", label: "WhatsApp & SMS campaigns", path: "/campaigns" },
  { key: "outreach", label: "Email outreach", path: "/outreach" },
  { key: "templates", label: "Templates", path: "/templates" },
  { key: "team", label: "Team", path: "/team" },
  { key: "developers", label: "API and extension", path: "/developers" },
  { key: "signals", label: "Lead signals", path: null },
  { key: "salestools", label: "Website demos and proposals", path: null },
  { key: "rank", label: "Google Maps rank tracker", path: "/rank" },
  { key: "sites", label: "Websites and hosting", path: "/sites" },
  { key: "reviews", label: "Review tools", path: null },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
export type FeatureConfig = Record<string, { on: boolean; plans: string[] }>; // plans empty = every plan, including free

export function featureForPath(path: string) {
  return FEATURES.find((f) => f.path && (path === f.path || path.startsWith(`${f.path}/`)))?.key ?? null;
}
