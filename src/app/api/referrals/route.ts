import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser, unauthorized } from "@/lib/http";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  return Array.from(randomBytes(8) as Uint8Array, (b: number) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function GET() {
  const user = await apiUser();
  if (!user) return unauthorized();
  let me = await db.user.findUnique({ where: { id: user.id }, select: { referralCode: true } });
  if (!me?.referralCode) {
    for (let i = 0; i < 5; i++) {
      try {
        me = await db.user.update({ where: { id: user.id }, data: { referralCode: makeCode() }, select: { referralCode: true } });
        break;
      } catch {
        /* code taken, try another */
      }
    }
  }
  const [signedUp, paid, reward] = await Promise.all([
    db.user.count({ where: { referredById: user.id } }),
    db.user.count({ where: { referredById: user.id, referralRewardedAt: { not: null } } }),
    getSetting("referral_credits"),
  ]);
  return NextResponse.json({ code: me?.referralCode, signedUp, paid, reward: Number(reward) || 0, earned: paid * (Number(reward) || 0) });
}
