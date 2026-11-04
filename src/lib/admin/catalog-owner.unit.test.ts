import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { CATALOG_ADMIN_NAVIGATION, CATALOG_SETTINGS_KEYS } from "./catalog-navigation";
import { fetchAdminDashboard } from "./dashboard";
import { buildAdminGamesWhere } from "./games-list";
import ReservationsPage from "../../app/admin/rezerwacje/page";
import LoansPage from "../../app/admin/wypozyczenia/page";
import CirculationPage from "../../app/admin/obsluga/page";
import ExtensionsPage from "../../app/admin/prosby-przedluzenia/page";
import UsersPage from "../../app/admin/uzytkownicy/page";
import CopiesPage from "../../app/admin/egzemplarze/page";
import StatisticsPage from "../../app/admin/statystyki/page";

describe("catalog owner panel", () => {
  it("offers game maintenance without circulation, inventory or user-management navigation", () => {
    const routes = CATALOG_ADMIN_NAVIGATION.flatMap((group) => group.links.map((link) => link.href));
    assert.ok(routes.includes("/admin/gry"));
    assert.ok(routes.includes("/admin/gry/nowa"));
    assert.ok(routes.includes("/admin/import"));
    for (const route of routes) assert.doesNotMatch(route, /rezerwacje|wypozyczenia|obsluga|przedluzenia|uzytkownicy|egzemplarze/);
    assert.deepEqual([...CATALOG_SETTINGS_KEYS], ["contactEmail", "contactPhone", "foundationAddress"]);
  });

  it("retired administration screens redirect before loading circulation data", () => {
    for (const page of [ReservationsPage, LoansPage, CirculationPage, ExtensionsPage, UsersPage, CopiesPage, StatisticsPage]) {
      assert.throws(() => page(), (error: unknown) =>
        typeof error === "object" && error !== null && "digest" in error &&
        String(error.digest).includes("/admin/gry"));
    }
  });

  it("dashboard reads only catalog records and catalog audit entries", async () => {
    const reads: string[] = [];
    const db = new Proxy({
      game: { count: async () => 0, findMany: async () => [] },
      auditLog: { findMany: async () => [] },
    }, {
      get(target, key) {
        assert.ok(key === "game" || key === "auditLog", "Unexpected non-catalog database access: " + String(key));
        reads.push(String(key));
        return target[key as keyof typeof target];
      },
    }) as unknown as Pick<PrismaClient, "game" | "auditLog">;
    const result = await fetchAdminDashboard(db);
    assert.ok(result);
    assert.equal(result.stats.gamesCount, 0);
    assert.equal("pendingReservations" in result.stats, false);
    assert.equal("activeLoans" in result.stats, false);
    assert.equal("recentReservations" in result, false);
    assert.equal("recentLoans" in result, false);
    assert.ok(reads.includes("game"));
    assert.ok(reads.includes("auditLog"));
  });

  it("owner title/publisher search combines metadata filters without enabling historical availability", () => {
    const where = buildAdminGamesWhere({ q: "Rebel", missingCover: "1", missingDescription: "1", missingCopies: "1", availability: "available" });
    assert.equal(where.deletedAt, null);
    assert.equal(where.copies, undefined);
    assert.ok(Array.isArray(where.AND));
    assert.equal(where.AND.length, 3);
    assert.deepEqual(where.AND[0], { OR: [
      { title: { contains: "Rebel", mode: "insensitive" } },
      { publisher: { name: { contains: "Rebel", mode: "insensitive" } } },
    ] });
  });
});
