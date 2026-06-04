import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEan13,
  normalizeEan,
  validateEanChecksum,
} from "./ean";
import { parseCollectionType } from "./collection-type";

describe("normalizeEan", () => {
  it("usuwa spacje i myślniki", () => {
    assert.equal(normalizeEan("590-1234 123457"), buildEan13("590123412345"));
  });

  it("akceptuje ISBN-13 978", () => {
    const isbn = buildEan13("978078696559");
    const n = normalizeEan(`978-078696559${isbn.slice(-1)}`);
    assert.equal(n, isbn);
    assert.ok(n.startsWith("978"));
  });

  it("rzuca przy złej długości", () => {
    assert.throws(() => normalizeEan("123"), /długość/);
  });

  it("rzuca przy niedozwolonych znakach", () => {
    assert.throws(() => normalizeEan("590ABC"), /niedozwolone/);
  });
});

describe("validateEanChecksum", () => {
  it("weryfikuje poprawny EAN-13", () => {
    const ean = buildEan13("590123412345");
    assert.equal(validateEanChecksum(ean), true);
  });

  it("odrzuca zły check digit", () => {
    assert.equal(validateEanChecksum("5901234123450"), false);
  });
});

describe("parseCollectionType", () => {
  it("mapuje polskie etykiety", () => {
    assert.equal(parseCollectionType("Gry planszowe"), "BOARD_GAME");
    assert.equal(parseCollectionType("Gry fabularne"), "RPG");
    assert.equal(parseCollectionType("fabularna"), "RPG");
    assert.equal(parseCollectionType("BOARD_GAME"), "BOARD_GAME");
  });
});
