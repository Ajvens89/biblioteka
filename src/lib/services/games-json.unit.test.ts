import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGamesJson } from "./games-json";

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
});
