import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allowedCopyStatusTargets,
  assertCopyStatusTransition,
  isCopyStatusTransitionAllowed,
} from "./copy-status";
import { ServiceError } from "./errors";

const noBlockers = { hasActiveLoan: false, hasActiveReservation: false };

describe("assertCopyStatusTransition", () => {
  it("pozwala na AVAILABLE → DAMAGED", () => {
    assert.doesNotThrow(() =>
      assertCopyStatusTransition("AVAILABLE", "DAMAGED", noBlockers),
    );
  });

  it("blokuje RETIRED → AVAILABLE", () => {
    assert.throws(
      () => assertCopyStatusTransition("RETIRED", "AVAILABLE", noBlockers),
      (e: unknown) => e instanceof ServiceError && e.code === "INVALID_TRANSITION",
    );
  });

  it("blokuje AVAILABLE przy aktywnym wypożyczeniu", () => {
    assert.throws(
      () =>
        assertCopyStatusTransition("DAMAGED", "AVAILABLE", {
          hasActiveLoan: true,
          hasActiveReservation: false,
        }),
      (e: unknown) => e instanceof ServiceError && e.code === "ACTIVE_LOAN",
    );
  });

  it("blokuje ręczną zmianę z BORROWED na AVAILABLE", () => {
    assert.throws(
      () => assertCopyStatusTransition("BORROWED", "AVAILABLE", noBlockers),
      (e: unknown) => e instanceof ServiceError,
    );
  });
});

describe("allowedCopyStatusTargets", () => {
  it("nie zwraca AVAILABLE dla BORROWED", () => {
    const targets = allowedCopyStatusTargets("BORROWED", noBlockers);
    assert.ok(!targets.includes("AVAILABLE"));
    assert.ok(targets.includes("DAMAGED"));
  });

  it("isCopyStatusTransitionAllowed zgadza się z listą", () => {
    for (const to of allowedCopyStatusTargets("AVAILABLE", noBlockers)) {
      assert.ok(isCopyStatusTransitionAllowed("AVAILABLE", to, noBlockers));
    }
  });
});
