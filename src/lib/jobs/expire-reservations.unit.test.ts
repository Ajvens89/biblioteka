import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Prisma, PrismaClient } from "@prisma/client";
import { expireReservations } from "./expire-reservations";

const testGlobal = globalThis as typeof globalThis & { prisma?: PrismaClient };
const previousPrisma = testGlobal.prisma;
let notifications = 0;
before(() => {
  testGlobal.prisma = {
    appSetting: { findMany: async () => [] },
    profile: { findUnique: async () => ({ emailNotificationsEnabled: false }) },
    notification: { create: async () => { notifications++; return { id: "notification" }; } },
    auditLog: { create: async () => ({}) },
  } as unknown as PrismaClient;
});
after(() => { testGlobal.prisma = previousPrisma; });

function expiryDb(options: { status?: string; extended?: boolean; copyStatus?: string } = {}) {
  const state = {
    status: options.status ?? "PENDING",
    copyStatus: options.copyStatus ?? "RESERVED",
    copyWrites: [] as string[],
  };
  const candidate = {
    id: "reservation", status: "PENDING", copyId: "stale-copy",
    userId: "reader", user: { email: "reader@example.invalid" }, game: { title: "Gra" },
  };
  const tx = {
    reservation: {
      // Old job code saw an apparently active snapshot before a concurrent issuance.
      findUnique: async () => ({ ...candidate, copyId: "actual-copy" }),
      updateMany: async ({ where }: { where: Prisma.ReservationWhereInput }) => {
        const filter = where.status as { in: string[] };
        if (!filter.in.includes(state.status) || (where.OR && options.extended)) return { count: 0 };
        state.status = "EXPIRED";
        return { count: 1 };
      },
      update: async () => { state.status = "EXPIRED"; },
    },
    gameCopy: { updateMany: async ({ where }: { where: { id: string; status: string } }) => {
      if (state.copyStatus !== where.status) return { count: 0 };
      state.copyStatus = "AVAILABLE";
      state.copyWrites.push(where.id);
      return { count: 1 };
    } },
  };
  const db = {
    reservation: { findMany: async () => [candidate] },
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx),
  } as unknown as PrismaClient;
  return { db, state };
}

describe("expiry job competing-state regressions", () => {
  it("does not expire an issued reservation or release its borrowed copy", async () => {
    const { db, state } = expiryDb({ status: "BORROWED", copyStatus: "BORROWED" });
    const beforeNotifications = notifications;
    assert.deepEqual(await expireReservations(db), { expired: 0, skipped: 1 });
    assert.equal(state.status, "BORROWED");
    assert.equal(state.copyStatus, "BORROWED");
    assert.equal(notifications, beforeNotifications);
  });

  it("honors a deadline extension made after the job selected its candidate", async () => {
    const { db, state } = expiryDb({ extended: true });
    assert.deepEqual(await expireReservations(db), { expired: 0, skipped: 1 });
    assert.equal(state.status, "PENDING");
    assert.equal(state.copyStatus, "RESERVED");
  });

  it("expires and notifies exactly once when two job runs see the same old candidate", async () => {
    const { db, state } = expiryDb();
    const beforeNotifications = notifications;
    const results = await Promise.all([expireReservations(db), expireReservations(db)]);
    assert.equal(results.reduce((total, result) => total + result.expired, 0), 1);
    assert.equal(results.reduce((total, result) => total + result.skipped, 0), 1);
    assert.equal(notifications - beforeNotifications, 1);
    assert.equal(state.status, "EXPIRED");
    assert.deepEqual(state.copyWrites, ["actual-copy"]);
  });

  it("keeps a damaged copy unavailable when its old reservation expires", async () => {
    const { db, state } = expiryDb({ copyStatus: "DAMAGED" });
    assert.deepEqual(await expireReservations(db), { expired: 1, skipped: 0 });
    assert.equal(state.copyStatus, "DAMAGED");
    assert.deepEqual(state.copyWrites, []);
  });
});
