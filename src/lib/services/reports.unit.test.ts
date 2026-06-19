import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reportRowsToCsv } from "./reports";
import type { WeeklyReportRow } from "./reports";

describe("reportRowsToCsv", () => {
  it("generuje nagłówek i wiersze CSV", () => {
    const rows: WeeklyReportRow[] = [
      { category: "Brak EAN", count: 3, sampleTitle: 'Gra "Test"', sampleSlug: "gra-test" },
    ];
    const csv = reportRowsToCsv(rows);
    assert.match(csv, /^kategoria,liczba,przyklad_tytul,przyklad_slug/);
    assert.match(csv, /"Brak EAN",3,"Gra ""Test""","gra-test"/);
  });

  it("zwraca sam nagłówek dla pustej listy", () => {
    assert.equal(reportRowsToCsv([]), "kategoria,liczba,przyklad_tytul,przyklad_slug");
  });
});
