import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRebelImageIndex,
  extractEansFromUrl,
  findRebelProductIdByEan,
  findRebelProductIdByTitle,
  parseRebelImagesCsvLine,
  pickBestRebelImageUrl,
  scoreRebelImageUrl,
} from "./rebel-images-provider";

describe("rebel-images-provider", () => {
  const sampleCsv = `IDProduct,ImageURL
2225,https://files.rebel.pl/products/100/606/_2225/Carcassonne2021.png
2225,https://files.rebel.pl/products/100/606/_2225/bard_carcassonne_wizualizacja_podczas_rozgrywki.png
107048,https://files.rebel.pl/products/100/1203/_107048/gra-planszowa-egmont-ryzyk-fizyk-pudelko.jpg
107048,https://files.rebel.pl/products/100/1203/_107048/gra-planszowa-egmont-ryzyk-fizyk-zawartosc.jpg
6024,https://files.rebel.pl/products/111/700/1666/_6024/83-86758-22-8.jpg`;

  it("parseRebelImagesCsvLine obsługuje cudzysłowy", () => {
    const row = parseRebelImagesCsvLine(
      '2225,"https://files.rebel.pl/products/100/606/_2225/32325,1430824731,Obrazek.jpg"',
    );
    assert.ok(row);
    assert.equal(row?.productId, "2225");
    assert.match(row?.imageUrl ?? "", /Obrazek\.jpg/);
  });

  it("extractEansFromUrl wyciąga cyfry ISBN z nazwy pliku", () => {
    const eans = extractEansFromUrl(
      "https://files.rebel.pl/products/111/700/1666/_6024/83-86758-22-8.jpg",
    );
    assert.ok(eans.some((e) => e.includes("838675822")));
  });

  it("pickBestRebelImageUrl preferuje pudełko nad zawartość", () => {
    const urls = [
      "https://files.rebel.pl/products/100/1203/_107048/gra-planszowa-egmont-ryzyk-fizyk-zawartosc.jpg",
      "https://files.rebel.pl/products/100/1203/_107048/gra-planszowa-egmont-ryzyk-fizyk-pudelko.jpg",
    ];
    const best = pickBestRebelImageUrl(urls);
    assert.match(best ?? "", /pudelko/);
  });

  it("scoreRebelImageUrl obniża gif i podgląd rozgrywki", () => {
    const box = scoreRebelImageUrl(
      "https://files.rebel.pl/products/100/606/_2225/Carcassonne2021.png",
    );
    const lifestyle = scoreRebelImageUrl(
      "https://files.rebel.pl/products/100/606/_2225/bard_carcassonne_wizualizacja_podczas_rozgrywki.png",
    );
    assert.ok(box > lifestyle);
  });

  it("findRebelProductIdByTitle dopasowuje Carcassonne", () => {
    const index = buildRebelImageIndex(sampleCsv);
    assert.equal(findRebelProductIdByTitle("Carcassonne", index), "2225");
  });

  it("findRebelProductIdByTitle dopasowuje Ryzyk Fizyk", () => {
    const index = buildRebelImageIndex(sampleCsv);
    assert.equal(findRebelProductIdByTitle("Ryzyk Fizyk", index), "107048");
  });
});
