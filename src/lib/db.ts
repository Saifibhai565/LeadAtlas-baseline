import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pragmas?: boolean };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// SQLite tuning: WAL lets reads continue while background workers write,
// and busy_timeout waits briefly instead of failing when the file is locked.
if (!globalForPrisma.pragmas) {
  globalForPrisma.pragmas = true;
  db.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => db.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch(() => undefined);
}
