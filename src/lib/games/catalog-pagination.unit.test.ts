import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { buildGameWhere, fetchGames } from "./queries";

describe("catalog pagination with a full library", () => {
  it("a valid age-zero filter is applied consistently with its active chip", () => {
    assert.deepEqual(buildGameWhere({ minAge: 0, page: 1, pageSize: 12, sort: "title" }).minAge, { lte: 0 });
  });

  it("an outdated page link fetches only the final valid page instead of an empty large offset", async () => {
    const requests: { skip: number; take: number }[] = [];
    const db = { game: {
      count: async () => 540,
      findMany: async (request: { skip: number; take: number }) => {
        requests.push(request);
        return Array.from({ length: request.take }, (_, index) => ({ id: `game-${request.skip + index}` }));
      },
    } } as unknown as Pick<PrismaClient, "game">;

    const result = await fetchGames({ page: 9999, pageSize: 12, sort: "title" }, db);
    assert.equal(result.page, 45);
    assert.equal(result.total, 540);
    assert.equal(result.items.length, 12);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].skip, 528);
    assert.equal(requests[0].take, 12);
  });

  it("a no-results query does not fetch a useless page and reports page one", async () => {
    const db = { game: {
      count: async () => 0,
      findMany: async () => { throw new Error("no page should be fetched"); },
    } } as unknown as Pick<PrismaClient, "game">;
    const result = await fetchGames({ q: "missing", page: 20, pageSize: 12, sort: "title" }, db);
    assert.deepEqual(result.items, []);
    assert.equal(result.page, 1);
    assert.equal(result.total, 0);
  });

  it("availability sorting loads full cards for one page and reuses its matching inventory total", async () => {
    const matching = Array.from({ length: 500 }, (_, index) => ({
      id: `game-${index}`, title: `Game ${String(index).padStart(3, "0")}`,
      copies: [{ status: "AVAILABLE" }],
    }));
    const fullPageRequests: string[][] = [];
    const db = { game: {
      count: async () => { throw new Error("matching IDs already supply the total"); },
      findMany: async (request: { select?: unknown; where: { id?: { in: string[] } }; take?: number }) => {
        if (request.select) return matching;
        const ids = request.where.id!.in;
        fullPageRequests.push(ids);
        // Simulate arbitrary DB order: the returned page must restore the computed ranking.
        return matching.filter((game) => ids.includes(game.id)).reverse();
      },
    } } as unknown as Pick<PrismaClient, "game">;

    const result = await fetchGames({ page: 9999, pageSize: 12, sort: "available" }, db);
    assert.equal(result.total, 500);
    assert.equal(result.page, 42);
    assert.equal(fullPageRequests.length, 1);
    assert.equal(fullPageRequests[0].length, 8);
    assert.deepEqual(result.items.map((game) => game.id), matching.slice(492).map((game) => game.id));
  });
});
