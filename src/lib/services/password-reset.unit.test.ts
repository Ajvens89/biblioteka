import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { ServiceError } from "./errors";
import { resetPasswordWithToken } from "./password-reset";

const testGlobal = globalThis as typeof globalThis & { prisma?: PrismaClient };
const previousPrisma = testGlobal.prisma;
before(() => {
  testGlobal.prisma = { auditLog: { create: async () => ({}) } } as unknown as PrismaClient;
});
after(() => { testGlobal.prisma = previousPrisma; });

function resetDb(expiredAtClaim = false) {
  const state = { used: false, passwordWrites: 0, invalidatedOthers: 0 };
  const db = {
    passwordResetToken: {
      // Both callers may observe this unused snapshot before either acquires its claim.
      findFirst: async () => ({ id: "reset-token", userId: "reader", usedAt: null }),
    },
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({
      passwordResetToken: {
        updateMany: async ({ where }: { where: { id?: string | { not: string }; usedAt?: null; expiresAt?: { gt: Date } } }) => {
          if (typeof where.id === "string") {
            if (state.used || expiredAtClaim || where.usedAt !== null || !where.expiresAt?.gt) return { count: 0 };
            state.used = true;
            return { count: 1 };
          }
          state.invalidatedOthers++;
          return { count: 0 };
        },
        update: async () => { state.used = true; },
      },
      profile: {
        update: async () => { state.passwordWrites++; },
      },
    }),
  } as unknown as PrismaClient;
  return { db, state };
}

describe("password reset atomic token claim", () => {
  it("allows exactly one of two concurrent attempts using the same token", async () => {
    const { db, state } = resetDb();
    const results = await Promise.allSettled([
      resetPasswordWithToken(db, "same-token", "New password number one!"),
      resetPasswordWithToken(db, "same-token", "New password number two!"),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(rejected?.status === "rejected");
    assert.ok(rejected.reason instanceof ServiceError && rejected.reason.code === "INVALID_TOKEN");
    assert.equal(state.passwordWrites, 1);
    assert.equal(state.invalidatedOthers, 1);
  });

  it("does not change a password if the token expires after its initial read", async () => {
    const { db, state } = resetDb(true);
    await assert.rejects(
      () => resetPasswordWithToken(db, "expired-during-request", "A new password!"),
      (error: unknown) => error instanceof ServiceError && error.code === "INVALID_TOKEN",
    );
    assert.equal(state.passwordWrites, 0);
    assert.equal(state.invalidatedOthers, 0);
  });
});
