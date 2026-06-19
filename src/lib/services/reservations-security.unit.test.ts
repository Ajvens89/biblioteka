import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { assertCanUserReserve } from "./reservations";
import { ServiceError } from "./errors";

function createMockPrisma(overrides: {
  overdueLoan?: unknown;
  activeReservations?: number;
}) {
  return {
    loan: {
      findFirst: async () => overrides.overdueLoan ?? null,
    },
    reservation: {
      count: async () => overrides.activeReservations ?? 0,
    },
  } as unknown as PrismaClient;
}

describe("assertCanUserReserve (SEC-001)", () => {
  it("blokuje przy przeterminowanym wypożyczeniu bez override", async () => {
    const prisma = createMockPrisma({ overdueLoan: { id: "loan-1" } });
    await assert.rejects(
      () => assertCanUserReserve(prisma, "user-1"),
      (e: unknown) => e instanceof ServiceError && e.code === "OVERDUE_LOAN",
    );
  });

  it("pomija blokady gdy override=true (tylko ścieżka staff)", async () => {
    const prisma = createMockPrisma({
      overdueLoan: { id: "loan-1" },
      activeReservations: 99,
    });
    await assert.doesNotReject(() =>
      assertCanUserReserve(prisma, "user-1", { override: true }),
    );
  });

  it("blokuje przy limicie rezerwacji bez override", async () => {
    const prisma = createMockPrisma({ activeReservations: 3 });
    await assert.rejects(
      () => assertCanUserReserve(prisma, "user-1"),
      (e: unknown) => e instanceof ServiceError && e.code === "RESERVATION_LIMIT",
    );
  });

  it("override=false nie omija limitu", async () => {
    const prisma = createMockPrisma({ activeReservations: 5 });
    await assert.rejects(() => assertCanUserReserve(prisma, "user-1", { override: false }));
  });
});

describe("createReservation — brak parametru override w API", () => {
  it("createReservation nie przyjmuje override z klienta", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/lib/actions/reservations.ts"),
      "utf8",
    );
    assert.match(source, /export async function createReservation\(\s*gameId: string,/);
    assert.doesNotMatch(source, /override = false/);
    assert.match(source, /export async function createReservationAsStaff/);
  });
});
