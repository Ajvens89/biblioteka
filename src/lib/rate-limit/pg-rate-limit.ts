import { createHash, randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type RateLimitScope =
  | "login"
  | "register"
  | "password-reset-request"
  | "password-reset-confirm"
  | "contact";

export type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
};

const DEFAULTS: Record<RateLimitScope, RateLimitConfig> = {
  login: { maxAttempts: 10, windowMs: 15 * 60_000 },
  register: { maxAttempts: 5, windowMs: 60 * 60_000 },
  "password-reset-request": { maxAttempts: 5, windowMs: 60 * 60_000 },
  "password-reset-confirm": { maxAttempts: 10, windowMs: 15 * 60_000 },
  contact: { maxAttempts: 5, windowMs: 60 * 60_000 },
};

export function hashRateLimitKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function clientKeyFromHeaders(forwardedFor: string | null, realIp: string | null): string {
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return realIp ?? "unknown";
}

function windowStart(now: Date, windowMs: number): Date {
  const ms = Math.floor(now.getTime() / windowMs) * windowMs;
  return new Date(ms);
}

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export async function checkRateLimit(
  db: PrismaClient,
  scope: RateLimitScope,
  rawKey: string,
  config?: Partial<RateLimitConfig>,
): Promise<RateLimitResult> {
  const cfg = { ...DEFAULTS[scope], ...config };
  const now = new Date();
  const keyHash = hashRateLimitKey(`${scope}:${rawKey}`);
  const winStart = windowStart(now, cfg.windowMs);
  const expiresAt = new Date(winStart.getTime() + cfg.windowMs);

  const entry = await db.rateLimitEntry.upsert({
    where: {
      scope_keyHash_windowStart: { scope, keyHash, windowStart: winStart },
    },
    create: { id: randomUUID(), scope, keyHash, windowStart: winStart, expiresAt, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (entry.count > cfg.maxAttempts) {
    return { allowed: false, retryAfterMs: expiresAt.getTime() - now.getTime() };
  }
  return { allowed: true, remaining: cfg.maxAttempts - entry.count };
}

/** Usuwa wygasłe wpisy (idempotentne, bezpieczne w cron). */
export async function purgeExpiredRateLimits(db: PrismaClient = prisma): Promise<number> {
  const result = await db.rateLimitEntry.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export function rateLimitErrorMessage(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000);
  return `Zbyt wiele prób. Spróbuj ponownie za ${minutes} min.`;
}
