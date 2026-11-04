import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidBarcodeLength, normalizeProductBarcode } from "./product-barcode";

describe("shared product barcode normalization", () => {
  it("retains empty/invalid input behavior", () => {
    for (const value of [undefined, null, "", "  ", "gra", "1234", "123456789012345"]) {
      assert.equal(normalizeProductBarcode(value), null);
    }
  });

  it("retains EAN-8 and EAN-13 values while removing formatting", () => {
    assert.equal(normalizeProductBarcode(" 1234-5678 "), "12345678");
    assert.equal(normalizeProductBarcode("590 1234 123457"), "5901234123457");
  });

  it("preserves the importer's existing 12-digit check-digit behavior", () => {
    assert.equal(normalizeProductBarcode("590123412345"), "5901234123457");
  });

  it("retains the 14-digit leading-zero and nonzero handling", () => {
    assert.equal(normalizeProductBarcode("05901234123457"), "5901234123457");
    assert.equal(normalizeProductBarcode("15901234123457"), "15901234123457");
  });

  it("accepts only the four supported digit lengths", () => {
    for (let length = 0; length <= 16; length++) {
      assert.equal(isValidBarcodeLength("1".repeat(length)), [8, 12, 13, 14].includes(length));
    }
  });
});
