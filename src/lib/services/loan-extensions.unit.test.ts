import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { extendLoan } from "./loans";
import { approveExtensionRequest, rejectExtensionRequest } from "./extension-requests";
import { ServiceError } from "./errors";

const testGlobal = globalThis as typeof globalThis & { prisma?: PrismaClient };
const previousPrisma = testGlobal.prisma;
let notifications = 0;
before(() => {
  testGlobal.prisma = {
    appSetting: { findMany: async () => [] },
    auditLog: { create: async () => ({}) },
    profile: { findUnique: async () => ({ emailNotificationsEnabled: false }) },
    notification: { create: async () => { notifications++; return { id: "notification" }; } },
  } as unknown as PrismaClient;
});
after(() => { testGlobal.prisma = previousPrisma; });

function extensionDb(currentStatus = "ACTIVE", currentRequestStatus = "PENDING") {
  const originalDue = new Date(Date.now() + 86_400_000);
  const state = {
    loanStatus: currentStatus, dueAt: originalDue, extensionCount: 0,
    requestStatus: currentRequestStatus, extensionRows: 0,
  };
  // A competing request may already have changed state after these original UI reads.
  const loanSnapshot = {
    id: "loan", status: "ACTIVE", dueAt: originalDue, extensionCount: 0,
    copy: { game: { title: "Gra" } },
  };
  const requestSnapshot = {
    id: "request", status: "PENDING", loan: loanSnapshot, requestedDays: 7, reason: null,
    userId: "reader", user: { email: "reader@example.invalid" },
  };
  let transactionTail = Promise.resolve();
  const tx = {
    loan: { updateMany: async ({ where, data }: {
      where: { status: { in: string[] }; dueAt: Date; extensionCount: number };
      data: { status: string; dueAt: Date; extensionCount: { increment: number } };
    }) => {
      if (!where.status.in.includes(state.loanStatus)
        || where.dueAt.getTime() !== state.dueAt.getTime()
        || where.extensionCount !== state.extensionCount) return { count: 0 };
      state.loanStatus = data.status;
      state.dueAt = data.dueAt;
      state.extensionCount += data.extensionCount.increment;
      return { count: 1 };
    } },
    loanExtension: { create: async () => { state.extensionRows++; } },
    loanExtensionRequest: { updateMany: async ({ where, data }: {
      where: { status: string }; data: { status: string };
    }) => {
      if (state.requestStatus !== where.status) return { count: 0 };
      state.requestStatus = data.status;
      return { count: 1 };
    } },
  };
  const db = {
    loan: { findUnique: async () => loanSnapshot },
    loanExtensionRequest: { ...tx.loanExtensionRequest, findUnique: async () => requestSnapshot },
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
      // Competing claims of the same row wait for the previous transaction's commit/rollback.
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const snapshot = structuredClone(state);
      try { return await work(tx); }
      catch (error) { Object.assign(state, snapshot); throw error; }
      finally { release(); }
    },
  } as unknown as PrismaClient;
  return { db, state };
}

const changed = (error: unknown) => error instanceof ServiceError && error.code === "LOAN_CHANGED";

describe("loan extension competing-state regressions", () => {
  it("staff extension cannot reopen a loan returned after its original read", async () => {
    const { db, state } = extensionDb("RETURNED");
    await assert.rejects(() => extendLoan(db, "loan", 7, { actorId: "staff" }), changed);
    assert.equal(state.loanStatus, "RETURNED");
    assert.equal(state.extensionRows, 0);
  });

  it("two stale extension attempts cannot consume two limits for the same original due date", async () => {
    const { db, state } = extensionDb();
    const results = await Promise.allSettled([
      extendLoan(db, "loan", 7, { actorId: "staff" }),
      extendLoan(db, "loan", 7, { actorId: "staff" }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(state.extensionCount, 1);
    assert.equal(state.extensionRows, 1);
  });

  it("rejects unsafe extension lengths before accessing a loan", async () => {
    for (const days of [-1, 0, 1.5, 22, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assert.rejects(() => extendLoan({} as PrismaClient, "loan", days, { actorId: "staff" }),
        (error: unknown) => error instanceof ServiceError && error.code === "INVALID_DAYS");
    }
  });

  it("approval rolls its request claim back instead of reopening a returned loan", async () => {
    const { db, state } = extensionDb("RETURNED");
    const beforeNotifications = notifications;
    await assert.rejects(() => approveExtensionRequest(db, "request", "staff"), changed);
    assert.equal(state.loanStatus, "RETURNED");
    assert.equal(state.requestStatus, "PENDING");
    assert.equal(state.extensionRows, 0);
    assert.equal(notifications, beforeNotifications);
  });

  it("an already-approved request cannot be approved or rejected using its old pending snapshot", async () => {
    const { db, state } = extensionDb("ACTIVE", "APPROVED");
    await assert.rejects(() => approveExtensionRequest(db, "request", "staff"));
    await assert.rejects(() => rejectExtensionRequest(db, "request", "staff"));
    assert.equal(state.requestStatus, "APPROVED");
    assert.equal(state.extensionRows, 0);
  });
});
