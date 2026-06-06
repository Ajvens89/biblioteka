import { PrismaClient } from "@prisma/client";
import { isPrismaConnectionError, isPrismaTransientError } from "@/lib/db-errors";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Singleton przez getter — bezpieczniejsze niż Proxy w RSC/Turbopack. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function reconnectPrismaIfNeeded(error: unknown): Promise<boolean> {
  if (!isPrismaTransientError(error) || process.env.NODE_ENV === "production") {
    return false;
  }
  try {
    await globalForPrisma.prisma?.$disconnect();
  } catch {
    /* ignore */
  }
  globalForPrisma.prisma = createPrismaClient();
  try {
    await globalForPrisma.prisma.$connect();
  } catch {
    /* ignore */
  }
  return true;
}

export async function withPrismaRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = isPrismaTransientError(error) && attempt < maxAttempts - 1;
      if (!canRetry) break;
      await reconnectPrismaIfNeeded(error);
      await sleep(150 * (attempt + 1));
    }
  }
  throw lastError;
}

/** Szybki test połączenia (np. przed renderem strony admin). */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await withPrismaRetry(() => prisma.$queryRaw`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function runPrismaSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await withPrismaRetry(fn);
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaTransientError(error)) {
      console.error("[db] Zapytanie Prisma nie powiodło się (dev):", error);
      return null;
    }
    if (isPrismaConnectionError(error)) {
      console.error("[db] Połączenie niedostępne:", error);
      return null;
    }
    throw error;
  }
}
