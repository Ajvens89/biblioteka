import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { importGamesFromFile, loadGamesJsonFile, resolveGamesJsonPath } from "../../../scripts/lib/games-json-files";

it("CLI still resolves and imports an explicitly selected JSON file without writes in dry-run", async () => {
  const temporaryRoot = path.resolve(tmpdir());
  const directory = await mkdtemp(path.join(temporaryRoot, "biblioteka-json-cli-test-"));
  try {
    const filePath = path.join(directory, "chosen-catalog.json");
    await writeFile(filePath, JSON.stringify({ version: 1, games: [{ title: "CLI game" }] }), "utf8");
    const resolved = resolveGamesJsonPath(["node", "import-games-json.ts", "--dry-run", filePath]);
    assert.equal(resolved, filePath);
    assert.equal((await loadGamesJsonFile(filePath)).games[0].title, "CLI game");
    const prisma = { game: { findFirst: async () => null } } as unknown as PrismaClient;
    const stats = await importGamesFromFile(prisma, filePath, { dryRun: true, noOverwrite: true });
    assert.equal(stats.read, 1);
    assert.equal(stats.created, 1);
    assert.equal(stats.filePath, filePath);
    assert.equal(stats.dryRun, true);
    assert.equal(stats.noOverwrite, true);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), temporaryRoot);
    assert.ok(path.basename(directory).startsWith("biblioteka-json-cli-test-"));
    await rm(directory, { recursive: true, force: true });
  }
});
