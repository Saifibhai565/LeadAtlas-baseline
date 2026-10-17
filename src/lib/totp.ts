import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Time-based one-time passwords (Google Authenticator etc.), with no external library. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20) {
  const buf = randomBytes(bytes);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of clean) bits += ALPHABET.indexOf(c).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret: InstanceType<typeof Buffer>, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/** Checks a 6-digit code, allowing the step before and after for clock drift. */
export function verifyTotp(secretBase32: string, token: string) {
  const t = (token ?? "").replace(/\D/g, "");
  if (t.length !== 6) return false;
  const secret = base32Decode(secretBase32);
  const step = Math.floor(Date.now() / 30000);
  for (let w = -1; w <= 1; w++) {
    const expected = hotp(secret, step + w);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(t))) return true;
  }
  return false;
}

/** otpauth:// URL that the authenticator app reads from a QR code. */
export function otpauthUrl(secret: string, email: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&period=30&digits=6`;
}

export function backupCodes(n = 8) {
  return Array.from({ length: n }, () => randomBytes(4).toString("hex"));
}
