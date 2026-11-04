import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Prisma, PrismaClient } from "@prisma/client";
import { updateCopyIfUnchanged } from "./copy-update";
import { ServiceError } from "./errors";

function copyDb(currentStatus: string, activeLoan = false, activeReservation = false) {
  const state = { status: currentStatus, writes: 0, notes: "original notes" };
  const db = { gameCopy: {
    updateMany: async ({ where, data }: { where: Prisma.GameCopyWhereInput; data: { status: string; notes?: string } }) => {
      if (where.status !== state.status) return { count: 0 };
      if (where.loans?.none && activeLoan) return { count: 0 };
      if (where.reservations?.none && activeReservation) return { count: 0 };
      state.status = data.status;
      state.notes = data.notes ?? state.notes;
      state.writes++;
      return { count: 1 };
    },
  } } as unknown as PrismaClient;
  return { db, state };
}

const changed = (error: unknown) => error instanceof ServiceError && error.code === "COPY_CHANGED";

describe("copy edits preserve competing circulation changes", () => {
  it("does not overwrite a new reservation with stale available status or editor fields", async () => {
    const { db, state } = copyDb("RESERVED", false, true);
    await assert.rejects(() => updateCopyIfUnchanged(db, "copy", "AVAILABLE", { status: "AVAILABLE", notes: "stale edit" }), changed);
    assert.equal(state.status, "RESERVED");
    assert.equal(state.notes, "original notes");
    assert.equal(state.writes, 0);
  });

  it("cannot make a damaged copy available while an active loan still owns it", async () => {
    const { db, state } = copyDb("DAMAGED", true);
    await assert.rejects(() => updateCopyIfUnchanged(db, "copy", "DAMAGED", { status: "AVAILABLE" }), changed);
    assert.equal(state.status, "DAMAGED");
  });

  it("cannot make a reserved copy available while its reservation is active", async () => {
    const { db, state } = copyDb("RESERVED", false, true);
    await assert.rejects(() => updateCopyIfUnchanged(db, "copy", "RESERVED", { status: "AVAILABLE" }), changed);
    assert.equal(state.status, "RESERVED");
  });

  it("allows an unclaimed repaired copy to become available", async () => {
    const { db, state } = copyDb("REPAIR");
    await updateCopyIfUnchanged(db, "copy", "REPAIR", { status: "AVAILABLE", notes: "Naprawiono" });
    assert.equal(state.status, "AVAILABLE");
    assert.equal(state.notes, "Naprawiono");
    assert.equal(state.writes, 1);
  });

  it("preserves staff's ability to record damage on a currently borrowed copy", async () => {
    const { db, state } = copyDb("BORROWED", true);
    await updateCopyIfUnchanged(db, "copy", "BORROWED", { status: "DAMAGED" });
    assert.equal(state.status, "DAMAGED");
  });
});
