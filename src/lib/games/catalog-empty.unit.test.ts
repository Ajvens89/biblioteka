import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogEmptyState } from "./catalog-empty";

describe("buildCatalogEmptyState", () => {
  it("sugeruje usunięcie filtru dostępności przy RPG + tylko dostępne", () => {
    const state = buildCatalogEmptyState(
      {
        collectionType: "RPG",
        availability: "available",
        page: 1,
        pageSize: 12,
        sort: "title",
      },
      { collectionType: "RPG", availability: "available" },
    );
    assert.match(state.title, /Brak dostępnych/);
    assert.match(state.description, /Tylko dostępne/);
    assert.equal(state.action.href, "/katalog?collectionType=RPG");
  });

  it("sugeruje usunięcie filtru dostępności bez kategorii", () => {
    const state = buildCatalogEmptyState(
      { availability: "available", page: 1, pageSize: 12, sort: "title" },
      { availability: "available" },
    );
    assert.equal(state.title, "Brak dostępnych egzemplarzy");
    assert.equal(state.action.href, "/katalog");
  });
});
