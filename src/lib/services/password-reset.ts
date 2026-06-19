import { createHash, randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { ServiceError } from "@/lib/services/errors";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60_000; // 60 minut

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function createPasswordResetToken(
  db: PrismaClient,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });

  return { token, expiresAt };
}

export async function resetPasswordWithToken(
  db: PrismaClient,
  token: string,
  newPassword: string,
): Promise<{ userId: string }> {
  const tokenHash = hashResetToken(token);
  const record = await db.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!record) {
    throw new ServiceError("Link resetu hasła jest nieprawidłowy lub wygasł.", "INVALID_TOKEN");
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    });
    await tx.profile.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
  });

  await logAudit({
    actorId: record.userId,
    action: "UPDATE",
    entityType: "profile",
    entityId: record.userId,
    metadata: { operation: "password_reset" },
  });

  return { userId: record.userId };
}

export async function purgeExpiredPasswordResetTokens(db: PrismaClient): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const result = await db.passwordResetToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { lt: cutoff } }],
    },
  });
  return result.count;
}
