import "server-only";
import { decrypt, encrypt } from "./crypto";
import { db } from "./db";

/** The shared sending server the Super Admin sets up once. Customers send through it with their own name. */
export type PlatformSmtp = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  passEnc: string;
  domains: string[]; // sending addresses must be on one of these domains (authenticated with SPF/DKIM)
  defaultFrom: string; // e.g. send@mail.yourdomain.com
  dailyLimit: number; // per customer mailbox
  gapSeconds: number; // wait between two emails from one customer
};

const KEY = "platform_smtp";

export async function getPlatformSmtp(): Promise<PlatformSmtp | null> {
  const row = await db.appSetting.findUnique({ where: { key: KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as PlatformSmtp;
  } catch {
    return null;
  }
}

export async function savePlatformSmtp(input: Omit<PlatformSmtp, "passEnc"> & { pass?: string }) {
  const current = await getPlatformSmtp();
  const value: PlatformSmtp = {
    enabled: input.enabled,
    host: input.host,
    port: input.port,
    user: input.user,
    passEnc: input.pass ? encrypt(input.pass) : current?.passEnc ?? "",
    domains: input.domains,
    defaultFrom: input.defaultFrom,
    dailyLimit: input.dailyLimit,
    gapSeconds: input.gapSeconds,
  };
  await db.appSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
  // Keep every customer's platform mailbox pointing at the current server
  await db.mailbox.updateMany({
    where: { platform: true },
    data: { host: value.host, port: value.port, username: value.user, passEnc: value.passEnc, gapSeconds: value.gapSeconds },
  });
  return value;
}

export function platformPassword(p: PlatformSmtp) {
  return p.passEnc ? decrypt(p.passEnc) : "";
}

/** A sending address is allowed only on the authenticated domains, so emails pass SPF/DKIM checks. */
export function allowedFrom(p: PlatformSmtp, email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return p.domains.some((d) => domain === d.toLowerCase());
}
