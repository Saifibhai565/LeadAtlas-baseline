import "server-only";
import { db } from "./db";

export async function notify(wsId: string, title: string, body?: string, link?: string) {
  await db.notification.create({ data: { userId: wsId, title: title.slice(0, 200), body: body?.slice(0, 1000), link } });
}
