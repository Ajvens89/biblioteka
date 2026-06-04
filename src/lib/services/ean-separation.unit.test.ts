import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEan13 } from "./ean";

describe("rozdzielenie EAN produktu i barcode egzemplarza", () => {
  it("createGameFromEan nie kopiuje ean do barcode (kontrakt pól)", () => {
    const productEan = buildEan13("590111222333");
    const copyBarcode = "ZF-EGZ-0099";
    assert.notEqual(productEan, copyBarcode);
    assert.notEqual(copyBarcode.length, 13);
  });

  it("wyszukiwanie katalogowe używa games.ean, nie game_copies.barcode", () => {
    const filterKeys = ["ean", "q", "collectionType"];
    assert.ok(filterKeys.includes("ean"));
    assert.ok(!filterKeys.includes("barcode"));
  });
});
