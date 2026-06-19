import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pluralPl } from "./plural-pl";

describe("pluralPl", () => {
  it("odmienia 1", () => {
    assert.equal(pluralPl(1, "pozycja", "pozycje", "pozycji"), "pozycja");
    assert.equal(pluralPl(1, "gra planszowa", "gry planszowe", "gier planszowych"), "gra planszowa");
  });

  it("odmienia 2–4", () => {
    assert.equal(pluralPl(2, "pozycja", "pozycje", "pozycji"), "pozycje");
    assert.equal(pluralPl(4, "egzemplarz", "egzemplarze", "egzemplarzy"), "egzemplarze");
  });

  it("odmienia 5+ i 12–14 jako many", () => {
    assert.equal(pluralPl(5, "pozycja", "pozycje", "pozycji"), "pozycji");
    assert.equal(pluralPl(12, "pozycja", "pozycje", "pozycji"), "pozycji");
    assert.equal(pluralPl(22, "pozycja", "pozycje", "pozycji"), "pozycje");
    assert.equal(pluralPl(509, "pozycja", "pozycje", "pozycji"), "pozycji");
  });
});
