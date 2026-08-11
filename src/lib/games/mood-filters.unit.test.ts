import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGameWhere } from "./queries";
import { buildMoodWhere, isCatalogMood } from "./mood-filters";

describe("mood filters", () => {
  it("rozpoznaje znane nastroje", () => {
    assert.equal(isCatalogMood("duo"), true);
    assert.equal(isCatalogMood("family"), true);
    assert.equal(isCatalogMood("impreza"), false);
  });

  it("duo wymaga dostępnego egzemplarza i wsparcia 2 graczy", () => {
    const where = buildMoodWhere("duo");
    assert.equal(where.collectionType, "BOARD_GAME");
    assert.deepEqual(where.minPlayers, { lte: 2 });
    assert.deepEqual(where.maxPlayers, { gte: 2 });
    assert.deepEqual(where.copies, { some: { status: "AVAILABLE" } });
  });

  it("short filtruje po maxPlayTime ≤ 30", () => {
    const where = buildMoodWhere("short");
    assert.deepEqual(where.maxPlayTime, { lte: 30, gt: 0 });
  });

  it("rpg to collectionType RPG", () => {
    assert.deepEqual(buildMoodWhere("rpg"), { collectionType: "RPG" });
  });
});

describe("buildGameWhere", () => {
  it("maxPlayTime filtruje długość partii, nie minPlayTime", () => {
    const where = buildGameWhere({
      maxPlayTime: 30,
      sort: "title",
      page: 1,
      pageSize: 12,
    });
    assert.deepEqual(where.maxPlayTime, { lte: 30, gt: 0 });
    assert.equal(where.minPlayTime, undefined);
  });

  it("category akceptuje wiele slugów (OR)", () => {
    const where = buildGameWhere({
      category: "rodzinne,gry-rodzinne",
      sort: "title",
      page: 1,
      pageSize: 12,
    });
    assert.deepEqual(where.categories, {
      some: { category: { slug: { in: ["rodzinne", "gry-rodzinne"] } } },
    });
  });

  it("mood=coop trafia do AND / Object.assign", () => {
    const where = buildGameWhere({
      mood: "coop",
      sort: "title",
      page: 1,
      pageSize: 12,
    });
    assert.equal(where.collectionType, "BOARD_GAME");
    assert.ok(where.OR);
  });

  it("mood + wyszukiwanie łączy warunki przez AND", () => {
    const where = buildGameWhere({
      mood: "short",
      q: "Klask",
      sort: "title",
      page: 1,
      pageSize: 12,
    });
    assert.ok(Array.isArray(where.AND));
    assert.equal((where.AND as unknown[]).length, 2);
  });
});
