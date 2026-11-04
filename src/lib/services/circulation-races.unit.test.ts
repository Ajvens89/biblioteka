import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { cancelReservation, markReadyForPickup, rejectReservation } from "./reservations";
import { issueLoanFromReservation, returnLoan } from "./loans";
import { ServiceError } from "./errors";

// No test calls a real database, including shared audit/settings helpers.
const testGlobal = globalThis as typeof globalThis & { prisma?: PrismaClient };
const previousPrisma = testGlobal.prisma;
before(() => {
  testGlobal.prisma = {
    auditLog: { create: async () => ({}) },
    appSetting: { findMany: async () => [] },
  } as unknown as PrismaClient;
});
after(() => { testGlobal.prisma = previousPrisma; });

const audit = { actorId: "staff" };
const invalidStatus = (error: unknown) => error instanceof ServiceError && error.code === "INVALID_STATUS";

function circulationDb(options: {
  reservationStatus?: string;
  copyStatus?: string;
  loanStatus?: string;
  staleReservationStatus?: string;
  staleLoanStatus?: string;
} = {}) {
  const state = {
    reservationStatus: options.reservationStatus ?? "PENDING",
    copyStatus: options.copyStatus ?? "RESERVED",
    loanStatus: options.loanStatus ?? "ACTIVE",
    copiesTouched: [] as string[],
    loansCreated: 0,
  };
  const reservation = (status: string) => ({
    id: "reservation", status, copyId: "actual-copy", gameId: "game", userId: "reader",
    game: { slug: "gra" }, copy: { id: "actual-copy" }, user: { email: "reader@example.invalid" },
  });
  const loan = (status: string) => ({
    id: "loan", status, copyId: "actual-copy", reservationId: "reservation",
    copy: { game: { slug: "gra" } }, reservation: reservation(state.reservationStatus),
  });
  const tx = {
    reservation: {
      findUnique: async () => reservation(state.reservationStatus),
      updateMany: async ({ where, data }: { where: { status?: string | { in: string[] } }; data: { status: string } }) => {
        const statuses = typeof where.status === "string" ? [where.status] : where.status?.in;
        if (statuses && !statuses.includes(state.reservationStatus)) return { count: 0 };
        state.reservationStatus = data.status;
        return { count: 1 };
      },
      update: async ({ data }: { data: { status: string } }) => {
        state.reservationStatus = data.status;
        return reservation(data.status);
      },
    },
    gameCopy: {
      updateMany: async ({ where, data }: { where: { id: string; status?: string | { in: string[] } }; data: { status: string } }) => {
        const statuses = typeof where.status === "string" ? [where.status] : where.status?.in;
        if (statuses && !statuses.includes(state.copyStatus)) return { count: 0 };
        state.copiesTouched.push(where.id);
        state.copyStatus = data.status;
        return { count: 1 };
      },
      update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        state.copiesTouched.push(where.id);
        state.copyStatus = data.status;
      },
    },
    loan: {
      findUnique: async () => loan(state.loanStatus),
      updateMany: async ({ where, data }: { where: { status: { in: string[] } }; data: { status: string } }) => {
        if (!where.status.in.includes(state.loanStatus)) return { count: 0 };
        state.loanStatus = data.status;
        return { count: 1 };
      },
      update: async ({ data }: { data: { status: string } }) => { state.loanStatus = data.status; },
      create: async () => { state.loansCreated++; return { id: "created-loan" }; },
    },
  };
  const db = {
    ...tx,
    reservation: {
      ...tx.reservation,
      findUnique: async () => reservation(options.staleReservationStatus ?? state.reservationStatus),
    },
    loan: {
      ...tx.loan,
      findUnique: async () => loan(options.staleLoanStatus ?? state.loanStatus),
    },
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
      const snapshot = structuredClone(state);
      try { return await work(tx); }
      catch (error) { Object.assign(state, snapshot); throw error; }
    },
  } as unknown as PrismaClient;
  return { db, state };
}

describe("circulation competing-state regressions", () => {
  it("does not cancel a reservation that was already issued after an earlier read", async () => {
    const { db, state } = circulationDb({ reservationStatus: "BORROWED", copyStatus: "BORROWED" });
    await assert.rejects(() => cancelReservation(db, "reservation", "actual-copy", audit), invalidStatus);
    assert.equal(state.reservationStatus, "BORROWED");
    assert.equal(state.copyStatus, "BORROWED");
    assert.deepEqual(state.copiesTouched, []);
  });

  it("cancellation uses the copy currently attached to the claimed reservation", async () => {
    const { db, state } = circulationDb();
    await cancelReservation(db, "reservation", "stale-or-unrelated-copy", audit);
    assert.deepEqual(state.copiesTouched, ["actual-copy"]);
    assert.equal(state.copyStatus, "AVAILABLE");
  });

  it("cancelling does not put a damaged copy back on the available shelf", async () => {
    const { db, state } = circulationDb({ copyStatus: "DAMAGED" });
    await cancelReservation(db, "reservation", "actual-copy", audit);
    assert.equal(state.reservationStatus, "CANCELLED");
    assert.equal(state.copyStatus, "DAMAGED");
  });

  it("does not issue a reservation cancelled between discovery and the transaction", async () => {
    const { db, state } = circulationDb({
      reservationStatus: "CANCELLED", staleReservationStatus: "PENDING", copyStatus: "AVAILABLE",
    });
    await assert.rejects(() => issueLoanFromReservation(db, "reservation", audit), invalidStatus);
    assert.equal(state.loansCreated, 0);
    assert.deepEqual(state.copiesTouched, []);
  });

  it("rolls its reservation claim back when the copy is no longer issuable", async () => {
    const { db, state } = circulationDb({ copyStatus: "BORROWED" });
    await assert.rejects(() => issueLoanFromReservation(db, "reservation", audit),
      (error: unknown) => error instanceof ServiceError && error.code === "COPY_BUSY");
    assert.equal(state.reservationStatus, "PENDING");
    assert.equal(state.loansCreated, 0);
  });

  it("issues a valid reservation and prevents issuing it twice", async () => {
    const { db, state } = circulationDb();
    const result = await issueLoanFromReservation(db, "reservation", audit);
    assert.equal(result.loanId, "created-loan");
    assert.equal(state.copyStatus, "BORROWED");
    await assert.rejects(() => issueLoanFromReservation(db, "reservation", audit), invalidStatus);
    assert.equal(state.loansCreated, 1);
  });

  it("a repeated stale return cannot release a copy which has been issued again", async () => {
    const { db, state } = circulationDb({ loanStatus: "RETURNED", staleLoanStatus: "ACTIVE", copyStatus: "BORROWED" });
    await assert.rejects(() => returnLoan(db, "loan", audit), invalidStatus);
    assert.equal(state.copyStatus, "BORROWED");
    assert.deepEqual(state.copiesTouched, []);
  });

  it("accepts an overdue return and preserves explicit damage handling", async () => {
    const { db, state } = circulationDb({ loanStatus: "OVERDUE", reservationStatus: "BORROWED", copyStatus: "BORROWED" });
    const result = await returnLoan(db, "loan", audit, { markDamaged: true, damageNotes: "Brak elementu" });
    assert.equal(result.copyStatus, "DAMAGED");
    assert.equal(state.copyStatus, "DAMAGED");
    assert.equal(state.loanStatus, "DAMAGED");
    assert.equal(state.reservationStatus, "RETURNED");
  });

  it("does not resurrect a cancelled reservation as ready for pickup", async () => {
    const { db, state } = circulationDb({ reservationStatus: "CANCELLED", staleReservationStatus: "PENDING" });
    await assert.rejects(() => markReadyForPickup(db, "reservation", audit), invalidStatus);
    assert.equal(state.reservationStatus, "CANCELLED");
  });

  it("reject preserves its narrower allowed states if readiness changes concurrently", async () => {
    const { db, state } = circulationDb({ reservationStatus: "READY_FOR_PICKUP", staleReservationStatus: "PENDING" });
    await assert.rejects(() => rejectReservation(db, "reservation", audit), invalidStatus);
    assert.equal(state.reservationStatus, "READY_FOR_PICKUP");
    assert.equal(state.copyStatus, "RESERVED");
  });
});
