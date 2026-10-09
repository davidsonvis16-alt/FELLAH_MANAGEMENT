import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Serverless hosts (Vercel) have a read-only filesystem and do not ship the
 * gitignored dev.db. With no real database configured, copy the bundled,
 * pre-seeded prisma/demo.db into /tmp - the one writable folder - and use that.
 * Data then lives until the instance is recycled, which suits a public demo.
 * Set DATABASE_URL to a hosted database for anything that must persist.
 */
function databaseUrl(): string | undefined {
  const configured = process.env.DATABASE_URL;
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless || (configured && !configured.startsWith("file:"))) return configured;

  const target = "/tmp/fellah-demo.db";
  if (!existsSync(target)) copyFileSync(path.join(process.cwd(), "prisma", "demo.db"), target);
  return `file:${target}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = databaseUrl();
if (url) process.env.DATABASE_URL = url;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
