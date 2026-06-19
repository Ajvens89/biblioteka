import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEan } from "../services/ean-validation";

describe("classifyEan", () => {
  it("oznacza brak kodu", () => {
    const r = classifyEan(null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, "MISSING");
  });

  it("akceptuje poprawny EAN-13", () => {
    const r = classifyEan("5902259201199");
    assert.equal(r.ok, true);
  });

  it("odrzuca błędną sumę kontrolną", () => {
    const r = classifyEan("5902259207333");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, "INVALID_CHECKSUM");
  });
});
