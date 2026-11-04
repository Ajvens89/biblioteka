import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCatalogUrlParams, parseCatalogQuery } from "./catalog-query";
import {
  buildCatalogQuery, buildFilterChips, clearFiltersQuery, countActiveFilters, hasAnyActiveParam,
  readFilterValues,
} from "./catalog-filters";

describe("public catalog URL input", () => {
  it("retains valid filters when unrelated values are malformed", () => {
    const { filters, params } = parseCatalogQuery({
      q: "  Catan  ", collectionType: "BOARD_GAME", availability: "available",
      difficulty: "not-a-difficulty", page: "NaN", sort: "bad-sort", minPlayers: "2",
    });
    assert.equal(filters.q, "Catan");
    assert.equal(filters.collectionType, "BOARD_GAME");
    assert.equal(filters.availability, "available");
    assert.equal(filters.minPlayers, 2);
    assert.equal(filters.page, 1);
    assert.equal(filters.sort, "title");
    assert.equal(params.difficulty, undefined);
    assert.equal(params.page, undefined);
  });

  it("accepts repeated Next.js search parameters without throwing in metadata or the page", () => {
    const { filters } = parseCatalogQuery({ q: ["Wiedźmin", "Catan"], page: ["2", "3"] });
    assert.equal(filters.q, "Wiedźmin");
    assert.equal(filters.page, 2);
  });

  it("preserves valid category, mood, numeric and sorting combinations", () => {
    const { filters } = parseCatalogQuery({
      category: "rodzinne,strategia", mood: "family", type: "BOARD", difficulty: "EASY",
      minPlayers: "2", maxPlayers: "6", minAge: "0", maxPlayTime: "90", sort: "available",
      page: "3", pageSize: "24", publisher: "rebel", designer: "knizia", tag: "rodzina",
    });
    assert.equal(filters.category, "rodzinne,strategia");
    assert.equal(filters.mood, "family");
    assert.equal(filters.minAge, 0);
    assert.equal(filters.page, 3);
    assert.equal(filters.pageSize, 24);
    assert.equal(filters.maxPlayTime, 90);
    assert.equal(filters.publisher, "rebel");
    assert.equal(filters.designer, "knizia");
    assert.equal(filters.tag, "rodzina");
  });

  it("rejects negative, fractional, nonfinite and database-overflowing numeric values", () => {
    for (const value of ["-1", "1.5", "Infinity", "NaN", "2147483648", "1e99"]) {
      const { filters } = parseCatalogQuery({ minPlayers: value, maxPlayTime: value, page: value });
      assert.equal(filters.minPlayers, undefined, value);
      assert.equal(filters.maxPlayTime, undefined, value);
      assert.equal(filters.page, 1, value);
    }
  });

  it("ignores blank values, unknown keys and oversized search text", () => {
    const { filters, params } = parseCatalogQuery({
      q: "x".repeat(201), minPlayers: " ", difficulty: "", tracking: "campaign", pageSize: "10000",
    });
    assert.equal(filters.q, undefined);
    assert.equal(filters.minPlayers, undefined);
    assert.equal(filters.pageSize, 12);
    assert.deepEqual(params, {});
  });

  it("client chips and filter counts reflect the same valid fields as server results", () => {
    const normalized = normalizeCatalogUrlParams(new URLSearchParams(
      "q=Catan&collectionType=BOARD_GAME&difficulty=invalid&minPlayers=-4&sort=nope&page=NaN&utm_source=mail",
    ));
    const chips = buildFilterChips(readFilterValues(normalized), {
      categories: [], tags: [], publishers: [], designers: [],
    });
    assert.equal(countActiveFilters(normalized), 1);
    assert.deepEqual(chips.map((chip) => chip.label), ["Planszówki"]);
    assert.equal(normalized.has("difficulty"), false);
    assert.equal(normalized.has("minPlayers"), false);
    assert.equal(normalized.has("sort"), false);
    assert.equal(normalized.get("q"), "Catan");
    assert.equal(normalized.get("utm_source"), "mail");
  });

  it("sorting and filter reset retain search/campaign values without reviving invalid filters", () => {
    const normalized = normalizeCatalogUrlParams(new URLSearchParams(
      "q=Wiedźmin&collectionType=RPG&difficulty=nope&availability=available&page=20&utm_source=mail",
    ));
    const changed = new URLSearchParams(buildCatalogQuery(normalized, { difficulty: "EASY" }));
    assert.equal(changed.get("difficulty"), "EASY");
    assert.equal(changed.has("page"), false);
    const reset = new URLSearchParams(clearFiltersQuery(changed));
    assert.equal(reset.get("q"), "Wiedźmin");
    assert.equal(reset.get("utm_source"), "mail");
    assert.equal(countActiveFilters(reset), 0);
    assert.equal(reset.has("difficulty"), false);
    assert.equal(reset.has("collectionType"), false);
  });

  it("unknown parameters stay available for navigation and do not activate filters", () => {
    const raw = new URLSearchParams("utm_source=mail&utm_source=qr&ref=festival&sort=invalid");
    const normalized = normalizeCatalogUrlParams(raw);
    assert.deepEqual(normalized.getAll("utm_source"), ["mail", "qr"]);
    assert.equal(normalized.get("ref"), "festival");
    assert.equal(hasAnyActiveParam(normalized), false);
    const { navigationParams, filters } = parseCatalogQuery({
      utm_source: "mail", ref: "festival", collectionType: "RPG", page: "2",
    });
    assert.equal(navigationParams.utm_source, "mail");
    assert.equal(navigationParams.page, "2");
    assert.equal(filters.collectionType, "RPG");
    assert.equal("utm_source" in filters, false);
  });

  it("empty category lists do not create a chip without a corresponding database filter", () => {
    const empty = normalizeCatalogUrlParams(new URLSearchParams("category=,%20,%20"));
    assert.equal(empty.has("category"), false);
    assert.equal(countActiveFilters(empty), 0);
    const valid = parseCatalogQuery({ category: "rodzinne, ,strategia,rodzinne" });
    assert.equal(valid.filters.category, "rodzinne,strategia");
  });

  it("exact EAN search removes the ignored text query from both displayed and server state", () => {
    const { filters, params } = parseCatalogQuery({ q: "Catan", ean: "5902560380734" });
    assert.equal(filters.ean, "5902560380734");
    assert.equal(filters.q, undefined);
    assert.equal(params.q, undefined);
    const client = normalizeCatalogUrlParams(new URLSearchParams("q=Catan&ean=5902560380734"));
    assert.equal(client.has("q"), false);
    assert.equal(client.get("ean"), "5902560380734");
  });
});
