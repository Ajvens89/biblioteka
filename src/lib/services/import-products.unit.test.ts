import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidBarcodeLength,
  normalizeProductBarcode,
  parseProductsJson,
} from "./import-products";

describe("import-products", () => {
  it("parseProductsJson wymaga tablicy collection", () => {
    const data = parseProductsJson(JSON.stringify({ collection: [{ name: "Test" }] }));
    assert.equal(data.collection?.length, 1);
    assert.throws(() => parseProductsJson("{}"));
  });

  it("normalizeProductBarcode akceptuje EAN-13", () => {
    const ean = normalizeProductBarcode("5908215009229");
    assert.equal(ean, "5908215009229");
  });

  it("isValidBarcodeLength dla 8/12/13/14", () => {
    assert.equal(isValidBarcodeLength("12345678"), true);
    assert.equal(isValidBarcodeLength("123456789012"), true);
    assert.equal(isValidBarcodeLength("1234567890123"), true);
    assert.equal(isValidBarcodeLength("12345678901234"), true);
    assert.equal(isValidBarcodeLength("123"), false);
  });

  it("odrzuca śmieciowy barcode", () => {
    assert.equal(normalizeProductBarcode("abc"), null);
  });
});
