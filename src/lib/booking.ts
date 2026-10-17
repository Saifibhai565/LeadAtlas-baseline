import "server-only";
import { db } from "./db";

export type DayHours = Record<string, [number, number]>; // {"mon":[9,17]} 24h
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function parseDays(json: string | null): DayHours {
  try {
    return json ? (JSON.parse(json) as DayHours) : { mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] };
  } catch {
    return { mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] };
  }
}

/** Free 30/x-minute slots for the next 14 days, minus already-booked times. Times are in the owner's timezone. */
export async function freeSlots(wsId: string) {
  const u = await db.user.findUnique({ where: { id: wsId }, select: { meetingMinutes: true, meetingDays: true, meetingTz: true } });
  if (!u) return [];
  const minutes = u.meetingMinutes || 30;
  const hours = parseDays(u.meetingDays);
  const booked = await db.booking.findMany({ where: { userId: wsId, status: "CONFIRMED", startsAt: { gte: new Date() } }, select: { startsAt: true } });
  const takenKeys = new Set(booked.map((b) => b.startsAt.toISOString().slice(0, 16)));

  const out: { date: string; label: string; slots: { iso: string; label: string }[] }[] = [];
  const now = new Date();
  for (let d = 1; d <= 14; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dh = hours[DAYS[day.getDay()]];
    if (!dh) continue;
    const [from, to] = dh;
    const slots: { iso: string; label: string }[] = [];
    for (let h = from * 60; h + minutes <= to * 60; h += minutes) {
      const slot = new Date(day);
      slot.setHours(Math.floor(h / 60), h % 60, 0, 0);
      if (slot <= now) continue;
      if (takenKeys.has(slot.toISOString().slice(0, 16))) continue;
      slots.push({ iso: slot.toISOString(), label: slot.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) });
    }
    if (slots.length) out.push({ date: day.toISOString().slice(0, 10), label: day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), slots });
  }
  return out;
}
