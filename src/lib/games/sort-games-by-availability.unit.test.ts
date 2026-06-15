import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { paginateIds, sortGamesByAvailableCopies } from "./sort-games-by-availability";

describe("sortGamesByAvailableCopies", () => {
  it("sortuje po liczbie dostępnych egzemplarzy malejąco", () => {
    const sorted = sortGamesByAvailableCopies([
      { id: "a", title: "Alpha", copies: [{ status: "AVAILABLE" }] },
      { id: "b", title: "Beta", copies: [{ status: "AVAILABLE" }, { status: "AVAILABLE" }] },
      { id: "c", title: "Gamma", copies: [{ status: "BORROWED" }] },
    ]);
    assert.deepEqual(
      sorted.map((g) => g.id),
      ["b", "a", "c"],
    );
  });

  it("przy remisie sortuje tytułem", () => {
    const sorted = sortGamesByAvailableCopies([
      { id: "b", title: "Beta", copies: [{ status: "AVAILABLE" }] },
      { id: "a", title: "Alpha", copies: [{ status: "AVAILABLE" }] },
    ]);
    assert.deepEqual(
      sorted.map((g) => g.id),
      ["a", "b"],
    );
  });
});

describe("paginateIds", () => {
  it("zwraca właściwy wycinek strony", () => {
    const ids = ["1", "2", "3", "4", "5"];
    assert.deepEqual(paginateIds(ids, 2, 2), ["3", "4"]);
  });
});
