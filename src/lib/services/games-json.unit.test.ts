import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { buildGamesExportFile, importGamesData, parseGamesJson, serializeGamesExport } from "./games-json";

describe("games-json", () => {
  it("parseGamesJson wymaga tablicy games", () => {
    const data = parseGamesJson(
      JSON.stringify({
        version: 1,
        games: [{ title: "Test" }],
      }),
    );
    assert.equal(data.games.length, 1);
    assert.throws(() => parseGamesJson("{}"));
  });

  it("odrzuca products.json z collection", () => {
    assert.throws(() =>
      parseGamesJson(JSON.stringify({ collection: [{ name: "X" }] })),
    );
  });

  it("imports parsed upload data in dry-run mode without filesystem access or DB writes", async () => {
    const prisma = { game: { findFirst: async ({ where }: { where: { slug?: string } }) =>
      where.slug === "known" ? { id: "existing-id" } : null,
    } } as unknown as PrismaClient;
    const data = parseGamesJson(JSON.stringify({ version: 1, games: [
      { title: "Known game", slug: "known", copies: [{ inventoryNumber: "COPY-1" }] },
      { title: "New RPG", slug: "new-rpg", collectionType: "RPG" },
    ] }));
    const stats = await importGamesData(prisma, data, {
      dryRun: true, noOverwrite: true, sourceName: "uploaded-catalog.json",
    });
    assert.deepEqual(stats, {
      filePath: "uploaded-catalog.json", dryRun: true, noOverwrite: true,
      read: 2, created: 1, updated: 1, skipped: 0, copiesCreated: 1, copiesUpdated: 0, issues: [],
    });
  });

  it("round-trips export metadata and copies through the filesystem-free JSON format", () => {
    const game = {
      title: "Żółw i gra", slug: "zolw-i-gra", ean: null, collectionType: "BOARD_GAME",
      description: "Opis", shortDescription: null, minPlayers: 2, maxPlayers: 4,
      minAge: 8, minPlayTime: 20, maxPlayTime: 40, difficulty: "EASY", type: "BOARD",
      yearPublished: 2025, coverImageUrl: "/covers/example.jpg", coverImageSource: "upload",
      instructionUrl: null, isActive: true, isFeatured: false,
      publisher: { name: "Wydawca" }, designer: { name: "Autorka" },
      categories: [{ category: { name: "Rodzinne" } }], tags: [{ tag: { name: "Wspólne" } }],
      copies: [{ inventoryNumber: "ZF-001", barcode: null, status: "AVAILABLE", condition: "GOOD", location: "Półka 1", notes: null }],
    };
    const file = buildGamesExportFile([game] as unknown as Parameters<typeof buildGamesExportFile>[0]);
    const parsed = parseGamesJson(serializeGamesExport(file));
    assert.deepEqual(parsed, file);
    assert.equal(parsed.games[0].copies?.[0].inventoryNumber, "ZF-001");
    assert.deepEqual(parsed.games[0].categories, ["Rodzinne"]);
    assert.equal(parsed.games[0].publisher, "Wydawca");
  });
});
