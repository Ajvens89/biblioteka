import assert from "node:assert/strict";
import test from "node:test";
import { parsePublicCatalogQuery } from "./public-catalog-query";

test("public catalog retains title/publisher search and bounded pagination", () => {
  const { filters } = parsePublicCatalogQuery({ q: " Azul ", publisher: "rebel", page: "2", pageSize: "24" });
  assert.equal(filters.q, "Azul");
  assert.equal(filters.publisher, "rebel");
  assert.equal(filters.page, 2);
  assert.equal(filters.pageSize, 24);
});

test("old availability, lending-related, EAN and mood URLs cannot change the public catalog", () => {
  const { filters, navigationParams } = parsePublicCatalogQuery({ q: "Rebel", availability: "available", ean: "5900511015591", mood: "duo", sort: "available", minPlayers: "2" });
  assert.equal(filters.q, "Rebel");
  assert.equal(filters.sort, "title");
  for (const key of ["availability", "ean", "mood", "minPlayers", "sort"]) assert.equal(navigationParams[key], undefined);
});

test("public collection links work while malformed query values remain harmless", () => {
  const { filters } = parsePublicCatalogQuery({ collectionType: "RPG", page: "-3", pageSize: "1000000", publisher: ["rebel", "other"] });
  assert.equal(filters.collectionType, "RPG");
  assert.equal(filters.page, 1);
  assert.equal(filters.pageSize, 12);
  assert.equal(filters.publisher, "rebel");
});
