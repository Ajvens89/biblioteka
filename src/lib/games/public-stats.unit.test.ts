import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { fetchPublicStats, gameListInclude } from "./queries";

describe("public catalog metadata", () => {
  it("counts active titles and collection types without reading stock", async () => {
    const games = [
      { isActive: true, deletedAt: null, collectionType: "BOARD_GAME" },
      { isActive: true, deletedAt: null, collectionType: "RPG" },
      { isActive: false, deletedAt: null, collectionType: "BOARD_GAME" },
      { isActive: true, deletedAt: new Date(), collectionType: "RPG" },
    ];
    const db = {
      game: { count: async ({ where }: { where: Record<string, unknown> }) =>
        games.filter(game => Object.entries(where).every(([key, value]) => game[key as keyof typeof game] === value)).length },
      gameCopy: { count: () => { throw new Error("Public stats must not read inventory"); } },
    } as unknown as Pick<PrismaClient, "game">;
    assert.deepEqual(await fetchPublicStats(db), { games: 2, boardGames: 1, rpgGames: 1 });
  });

  it("public cards do not retrieve physical copies or reservations", () => {
    assert.equal("copies" in gameListInclude, false);
    assert.equal("reservations" in gameListInclude, false);
  });
});
