// Edge-safe helpers (used by middleware). No database or Node-only imports here.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "la_session";
const MAX_AGE_DAYS = 30;
export const SESSION_MAX_AGE = 60 * 60 * 24 * MAX_AGE_DAYS;

export type SessionPayload = { uid: string; role: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in your .env file.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid, role: String(payload.role ?? "USER") };
  } catch {
    return null;
  }
}
