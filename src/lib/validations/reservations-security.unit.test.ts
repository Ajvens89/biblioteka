import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createReservationAsStaffSchema,
  createReservationSchema,
} from "@/lib/validations/ids";

describe("createReservationSchema (SEC-001)", () => {
  it("akceptuje tylko gameId — brak pola override", () => {
    const gameId = "550e8400-e29b-41d4-a716-446655440000";
    const result = createReservationSchema.safeParse({ gameId });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(Object.keys(result.data), ["gameId"]);
    }
  });

  it("odrzuca nieprawidłowy UUID", () => {
    const result = createReservationSchema.safeParse({ gameId: "not-uuid" });
    assert.equal(result.success, false);
  });

  it("ignoruje/nie definiuje override w schemacie użytkownika", () => {
    const gameId = "550e8400-e29b-41d4-a716-446655440000";
    const result = createReservationSchema.safeParse({ gameId, override: true });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal("override" in result.data, false);
    }
  });
});

describe("createReservationAsStaffSchema", () => {
  const valid = {
    gameId: "550e8400-e29b-41d4-a716-446655440000",
    targetUserId: "660e8400-e29b-41d4-a716-446655440001",
    reason: "Rezerwacja przy ladzie — limit tymczasowo przekroczony",
    bypassLimits: true,
  };

  it("akceptuje poprawne dane staff", () => {
    assert.equal(createReservationAsStaffSchema.safeParse(valid).success, true);
  });

  it("wymaga powodu min. 3 znaki", () => {
    const result = createReservationAsStaffSchema.safeParse({ ...valid, reason: "ab" });
    assert.equal(result.success, false);
  });

  it("targetUserId musi być UUID", () => {
    const result = createReservationAsStaffSchema.safeParse({
      ...valid,
      targetUserId: "invalid",
    });
    assert.equal(result.success, false);
  });
});
