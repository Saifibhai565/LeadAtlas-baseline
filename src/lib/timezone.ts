import "server-only";

/** Rough timezone from a lead's country/city in its address, so emails go at a sensible local hour. */
const ZONES: { test: RegExp; tz: string }[] = [
  { test: /pakistan|lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta/i, tz: "Asia/Karachi" },
  { test: /india|delhi|mumbai|bangalore|chennai|kolkata|hyderabad/i, tz: "Asia/Kolkata" },
  { test: /bangladesh|dhaka/i, tz: "Asia/Dhaka" },
  { test: /\buae\b|dubai|abu dhabi|sharjah/i, tz: "Asia/Dubai" },
  { test: /saudi|riyadh|jeddah/i, tz: "Asia/Riyadh" },
  { test: /\buk\b|united kingdom|london|manchester|birmingham/i, tz: "Europe/London" },
  { test: /\busa\b|united states|new york|\bNY\b|texas|\bTX\b|california|\bCA\b|chicago|florida|\bFL\b/i, tz: "America/New_York" },
  { test: /canada|toronto|vancouver/i, tz: "America/Toronto" },
  { test: /australia|sydney|melbourne/i, tz: "Australia/Sydney" },
];

export function zoneForAddress(address: string | null): string | null {
  if (!address) return null;
  return ZONES.find((z) => z.test.test(address))?.tz ?? null;
}

/** Current hour (0-23) in a zone. */
export function hourIn(tz: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date())) % 24;
  } catch {
    return new Date().getHours();
  }
}

/** Is it inside the allowed send window right now? Window of 0..0 means "any time". */
export function withinWindow(fromHour: number, toHour: number, tz: string | null): boolean {
  if (fromHour === toHour) return true; // no restriction
  const h = tz ? hourIn(tz) : new Date().getHours();
  return fromHour < toHour ? h >= fromHour && h < toHour : h >= fromHour || h < toHour;
}
