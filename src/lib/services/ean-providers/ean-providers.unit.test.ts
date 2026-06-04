import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEan13, isIsbn13, normalizeEan } from "../ean";
import { pickAutoSelectedCandidate } from "./index";
import { EAN_SOURCE_UI_LABELS } from "./types";
import { validateCoverImageUrl } from "./image-utils";
import type { CoverCandidate } from "./types";

describe("ean-providers — kolejność i reguły", () => {
  it("ISBN 978/979 jest rozpoznawane jako książka", () => {
    const isbn = buildEan13("978078696559");
    assert.equal(isIsbn13(normalizeEan(isbn)), true);
  });

  it("EAN planszówki nie jest ISBN", () => {
    const board = buildEan13("590123412345");
    assert.equal(isIsbn13(board), false);
  });

  it("komunikat manual opisuje ręczne uzupełnienie", () => {
    assert.match(EAN_SOURCE_UI_LABELS.manual, /Nie znaleziono okładki automatycznie/);
    assert.match(EAN_SOURCE_UI_LABELS.manual, /Planszeo|BGG/);
  });

  it("etykiety zewnętrznych źródeł wymagają weryfikacji admina", () => {
    assert.match(EAN_SOURCE_UI_LABELS.google_books, /sprawdź przed zapisem/i);
    assert.match(EAN_SOURCE_UI_LABELS.open_library, /sprawdź przed zapisem/i);
  });

  it("odrzuca niebezpieczne protokoły URL okładki", () => {
    assert.equal(validateCoverImageUrl("javascript:void(0)"), null);
    assert.equal(validateCoverImageUrl("https://cdn.example/cover.png"), "https://cdn.example/cover.png");
  });

  it("nie wybiera automatycznie wielu kandydatów BGG", () => {
    const candidates: CoverCandidate[] = [
      { source: "bgg", title: "A", confidence: "high", coverImageUrl: "https://a.test/1.jpg", externalId: "1" },
      { source: "bgg", title: "B", confidence: "high", coverImageUrl: "https://a.test/2.jpg", externalId: "2" },
    ];
    assert.equal(pickAutoSelectedCandidate(candidates), undefined);
  });

  it("wybiera jednego kandydata high spoza BGG", () => {
    const candidates: CoverCandidate[] = [
      {
        source: "google_books",
        title: "Book",
        confidence: "high",
        coverImageUrl: "https://books.google.com/x.jpg",
      },
    ];
    assert.equal(pickAutoSelectedCandidate(candidates)?.source, "google_books");
  });
});
