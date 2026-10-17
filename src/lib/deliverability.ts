import "server-only";
import { promises as dns } from "node:dns";
import net from "node:net";

/** DNS authentication check: SPF, DKIM and DMARC for a sending domain. */
export async function checkDns(domain: string, dkimSelectors: string[] = ["default", "google", "selector1", "selector2", "k1", "mail", "dkim", "s1", "s2"]) {
  const d = domain.toLowerCase().replace(/^@/, "").trim();
  const result: { spf: { ok: boolean; record?: string; note?: string }; dkim: { ok: boolean; selector?: string; note?: string }; dmarc: { ok: boolean; record?: string; policy?: string; note?: string }; mx: boolean } = {
    spf: { ok: false },
    dkim: { ok: false },
    dmarc: { ok: false },
    mx: false,
  };
  try {
    result.mx = (await dns.resolveMx(d)).length > 0;
  } catch {
    result.mx = false;
  }
  try {
    const txt = (await dns.resolveTxt(d)).map((t) => t.join(""));
    const spf = txt.find((t) => t.toLowerCase().startsWith("v=spf1"));
    if (spf) {
      result.spf = { ok: true, record: spf };
      if (/\+all/.test(spf)) result.spf.note = "Ends with +all, which lets anyone send as you. Use ~all or -all.";
    } else {
      result.spf.note = "No SPF record. Add one so Gmail and Outlook trust your mail.";
    }
  } catch {
    result.spf.note = "Couldn't read the domain's TXT records.";
  }
  for (const sel of dkimSelectors) {
    try {
      const rec = (await dns.resolveTxt(`${sel}._domainkey.${d}`)).map((t) => t.join("")).find((t) => /v=dkim1|k=rsa|p=/i.test(t));
      if (rec) {
        result.dkim = { ok: true, selector: sel };
        break;
      }
    } catch {
      /* selector not present, try next */
    }
  }
  if (!result.dkim.ok) result.dkim.note = "No DKIM record found at the common selectors. Your email provider gives you the record to add.";
  try {
    const dmarc = (await dns.resolveTxt(`_dmarc.${d}`)).map((t) => t.join("")).find((t) => t.toLowerCase().startsWith("v=dmarc1"));
    if (dmarc) {
      const policy = dmarc.match(/p=(\w+)/i)?.[1]?.toLowerCase() ?? "none";
      result.dmarc = { ok: true, record: dmarc, policy };
      if (policy === "none") result.dmarc.note = "DMARC is set to monitor only (p=none). That's fine to start; move to quarantine later.";
    } else {
      result.dmarc.note = "No DMARC record. Add one (start with p=none) to protect your domain.";
    }
  } catch {
    result.dmarc.note = "Couldn't read the _dmarc record.";
  }
  const score = Math.round(((result.spf.ok ? 1 : 0) + (result.dkim.ok ? 1 : 0) + (result.dmarc.ok ? 1 : 0)) / 3 * 100);
  return { result, score };
}

const RBLS = ["zen.spamhaus.org", "b.barracudacentral.org", "bl.spamcop.net", "dnsbl.sorbs.net"];

/** Checks if an IP is on common email blacklists. */
export async function checkBlacklist(ip: string) {
  if (!net.isIPv4(ip)) return { listed: [], checked: 0, note: "Only IPv4 addresses can be checked." };
  const reversed = ip.split(".").reverse().join(".");
  const listed: string[] = [];
  await Promise.all(
    RBLS.map(async (rbl) => {
      try {
        await dns.resolve4(`${reversed}.${rbl}`);
        listed.push(rbl.split(".").slice(-2)[0]);
      } catch {
        /* not listed on this RBL */
      }
    }),
  );
  return { listed, checked: RBLS.length };
}

/** A spam-word scan of a draft, with a 0-100 deliverability score and specific warnings. */
const SPAM_WORDS = [
  "free", "guarantee", "guaranteed", "no cost", "risk-free", "risk free", "winner", "congratulations", "cash", "$$$", "100%", "act now", "limited time",
  "urgent", "click here", "buy now", "order now", "cheap", "discount", "lowest price", "earn money", "make money", "income", "investment", "credit",
  "loan", "offer expires", "once in a lifetime", "amazing", "bonus", "prize", "deal", "promotion", "sale", "exclusive", "miracle", "viagra", "casino",
  "crypto", "bitcoin", "work from home", "double your",
];

export function scanContent(subject: string, body: string) {
  const text = `${subject}\n${body}`;
  const low = text.toLowerCase();
  const warnings: string[] = [];
  const found = SPAM_WORDS.filter((w) => low.includes(w));
  if (found.length) warnings.push(`Spam-trigger words: ${[...new Set(found)].slice(0, 8).join(", ")}`);
  const caps = subject.replace(/[^A-Za-z]/g, "");
  if (caps.length > 6 && caps === caps.toUpperCase()) warnings.push("The subject is all capitals, which looks like spam.");
  if ((text.match(/!/g) ?? []).length > 3) warnings.push("Too many exclamation marks.");
  const links = (body.match(/https?:\/\//g) ?? []).length;
  if (links > 3) warnings.push(`${links} links. Keep it to one or two in a cold email.`);
  if (/<img|\.(png|jpe?g|gif)\b/i.test(body)) warnings.push("Images in a cold email hurt deliverability. Plain text reaches the inbox more often.");
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > 200) warnings.push(`${words} words. Short emails (under 150) get more replies.`);
  if (words < 15 && words > 0) warnings.push("Very short. Add a line about why you're reaching out.");
  if (!/unsubscribe|opt.?out|reply.*stop/i.test(low)) warnings.push("No unsubscribe line (the app adds one automatically, but mentioning it helps trust).");
  let score = 100 - found.length * 7 - Math.max(0, warnings.length - (found.length ? 1 : 0)) * 8;
  score = Math.max(0, Math.min(100, score));
  return { score, warnings, spamWords: [...new Set(found)] };
}
