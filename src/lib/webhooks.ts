import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { assertPublicHost, normalizeUrl } from "./web";

export const WEBHOOK_EVENTS = ["lead.created", "search.finished", "lead.status_changed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Sends an event to every active webhook of the workspace that listens for it. Never throws. */
export async function emit(wsId: string, event: WebhookEvent, data: unknown) {
  try {
    const hooks = await db.webhook.findMany({ where: { userId: wsId, active: true, events: { contains: event } } });
    await Promise.all(hooks.map((h) => deliver(h.id, h.url, h.secret, event, data)));
  } catch {
    /* webhooks must never break the app */
  }
}

export async function deliver(id: string, url: string, secret: string, event: string, data: unknown) {
  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  let status = 0;
  const target = normalizeUrl(url);
  if (target) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      await assertPublicHost(target.hostname);
      const res = await fetch(target.toString(), {
        redirect: "manual",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LeadAtlas-Event": event,
          "X-LeadAtlas-Signature": `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
      });
      status = res.status;
    } catch {
      status = 0;
    } finally {
      clearTimeout(t);
    }
  }
  await db.webhook.update({ where: { id }, data: { lastStatus: status, lastAt: new Date() } }).catch(() => undefined);
  return status;
}

/** The fields we share about a lead outside the app. */
export function publicLead(l: {
  id: string;
  title: string;
  category: string | null;
  phone: string | null;
  emails: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  status: string;
  score: number | null;
  auditScore: number | null;
  auditIssues: string | null;
  socials: string | null;
  source: string;
  createdAt: Date;
}) {
  let socials: Record<string, string> = {};
  try {
    socials = l.socials ? JSON.parse(l.socials) : {};
  } catch {
    socials = {};
  }
  return {
    id: l.id,
    name: l.title,
    category: l.category,
    phone: l.phone,
    emails: l.emails ? l.emails.split(",").map((e) => e.trim()) : [],
    website: l.website,
    address: l.address,
    rating: l.rating,
    reviews: l.reviewCount,
    location: l.latitude != null && l.longitude != null ? { lat: l.latitude, lng: l.longitude } : null,
    googleMapsUrl: l.mapsUrl,
    status: l.status,
    score: l.score,
    websiteScore: l.auditScore,
    websiteIssues: l.auditIssues ? l.auditIssues.split(",") : [],
    socials,
    source: l.source,
    createdAt: l.createdAt,
  };
}
