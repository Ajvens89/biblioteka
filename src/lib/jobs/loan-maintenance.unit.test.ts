import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { markOverdueLoansJob } from "./loan-maintenance";

const testGlobal = globalThis as typeof globalThis & { prisma?: PrismaClient };
const previousPrisma = testGlobal.prisma;
let notifications = 0;
before(() => {
  testGlobal.prisma = {
    auditLog: { create: async () => ({}) },
    profile: { findUnique: async () => ({ emailNotificationsEnabled: false }) },
    notification: { create: async () => { notifications++; return { id: "notification" }; } },
  } as unknown as PrismaClient;
});
after(() => { testGlobal.prisma = previousPrisma; });

function overdueDb(extended = false, currentStatus = "ACTIVE") {
  const state = { status: currentStatus, dueAt: new Date(Date.now() + (extended ? 86_400_000 : -86_400_000)) };
  const candidate = {
    id: "loan", userId: "reader", status: "ACTIVE", overdueNotifiedAt: null,
    user: { email: "reader@example.invalid" }, copy: { game: { title: "Gra" } },
  };
  const db = { loan: {
    findMany: async () => [candidate],
    updateMany: async ({ where }: { where: { status: string; dueAt?: { lt: Date } } }) => {
      if (where.status !== state.status || (where.dueAt && state.dueAt >= where.dueAt.lt)) return { count: 0 };
      state.status = "OVERDUE";
      return { count: 1 };
    },
    update: async () => ({}),
  } } as unknown as PrismaClient;
  return { db, state };
}

describe("overdue job respects concurrent circulation changes", () => {
  it("does not mark a newly extended future loan overdue or notify its user", async () => {
    const { db, state } = overdueDb(true);
    const beforeNotifications = notifications;
    assert.deepEqual(await markOverdueLoansJob(db), { marked: 0 });
    assert.equal(state.status, "ACTIVE");
    assert.equal(notifications, beforeNotifications);
  });

  it("does not reopen a returned loan as overdue", async () => {
    const { db, state } = overdueDb(false, "RETURNED");
    assert.deepEqual(await markOverdueLoansJob(db), { marked: 0 });
    assert.equal(state.status, "RETURNED");
  });

  it("still marks and notifies a genuinely overdue active loan exactly once", async () => {
    const { db, state } = overdueDb();
    const beforeNotifications = notifications;
    assert.deepEqual(await markOverdueLoansJob(db), { marked: 1 });
    assert.deepEqual(await markOverdueLoansJob(db), { marked: 0 });
    assert.equal(state.status, "OVERDUE");
    assert.equal(notifications - beforeNotifications, 1);
  });
});
