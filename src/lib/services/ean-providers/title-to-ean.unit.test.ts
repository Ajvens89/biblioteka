import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGeminiTitleEanResponse } from "./gemini-title-ean-provider";
import { extractGtinFromHtml } from "./planszeo-ean";

describe("extractGtinFromHtml", () => {
  it("wyciąga gtin13 z JSON-LD", () => {
    const html = `<script>{"gtin13":"5902560384888","name":"Messina 1347"}</script>`;
    assert.equal(extractGtinFromHtml(html), "5902560384888");
  });

  it("wyciąga gtin z microdata", () => {
    const html = `<meta itemprop="gtin13" content="5902560384888" />`;
    assert.equal(extractGtinFromHtml(html), "5902560384888");
  });

  it("zwraca null gdy brak poprawnego EAN", () => {
    assert.equal(extractGtinFromHtml("<html>brak</html>"), null);
  });
});

describe("parseGeminiTitleEanResponse", () => {
  it("parsuje czysty JSON", () => {
    const parsed = parseGeminiTitleEanResponse(
      '{"ean":"5902560384888","title":"Messina 1347","confidence":"high"}',
    );
    assert.equal(parsed?.ean, "5902560384888");
    assert.equal(parsed?.title, "Messina 1347");
  });

  it("parsuje JSON w fence markdown", () => {
    const parsed = parseGeminiTitleEanResponse(
      '```json\n{"ean":"5902560384888","confidence":"medium"}\n```',
    );
    assert.equal(parsed?.ean, "5902560384888");
  });
});
