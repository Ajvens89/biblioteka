import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractAleplanszowkiCoverFromHtml,
  extractAleplanszowkiGtinFromHtml,
  extractAleplanszowkiProductLinks,
  extractAleplanszowkiTitleFromHtml,
} from "./aleplanszowki-provider";
import {
  extractPlanszeoSearchHits,
  pickBestPlanszeoHit,
  pickBestPlanszeoSlug,
} from "./planszeo-provider";

describe("aleplanszowki-provider — parsowanie HTML", () => {
  const searchHtml = `
    <a href="https://aleplanszowki.pl/przygodowe/21690-adele-edycja-polska-5902259207450.html">ADELE</a>
    <a href="https://aleplanszowki.pl/content/about.html">About</a>
    <img src="/58751-home_default/adele-edycja-polska.jpg" />
  `;

  const productHtml = `
    <meta property="og:title" content="A.D.E.L.E. (edycja polska)" />
    <meta property="og:image" content="https://aleplanszowki.pl/58751-home_default/adele-edycja-polska.jpg" />
    <meta itemprop="gtin13" content="5902259207450" />
  `;

  it("wyciąga link produktu z EAN w URL", () => {
    const links = extractAleplanszowkiProductLinks(searchHtml, "5902259207450");
    assert.equal(links.length, 1);
    assert.match(links[0]!, /5902259207450\.html$/);
  });

  it("wyciąga tytuł, GTIN i large_default okładkę", () => {
    assert.equal(extractAleplanszowkiTitleFromHtml(productHtml), "A.D.E.L.E. (edycja polska)");
    assert.equal(extractAleplanszowkiGtinFromHtml(productHtml), "5902259207450");
    assert.equal(
      extractAleplanszowkiCoverFromHtml(productHtml),
      "https://aleplanszowki.pl/58751-large_default/adele-edycja-polska.jpg",
    );
  });
});

describe("planszeo-provider — PL tytuł vs EN slug", () => {
  const searchHtml = `
    <a href="/gry-planszowe/heroes-of-tenefyr/oferty">
      <img alt="Bohaterowie Tenefyru" src="x.jpg" />
    </a>
    <a href="/gry-planszowe/bohaterowie-wykleci/oferty">
      <img alt="Bohaterowie wyklęci" src="y.jpg" />
    </a>
  `;

  it("extractPlanszeoSearchHits łączy slug z polskim alt", () => {
    const hits = extractPlanszeoSearchHits(searchHtml);
    const tenefyr = hits.find((h) => h.slug === "heroes-of-tenefyr");
    assert.ok(tenefyr);
    assert.equal(tenefyr!.displayTitle, "Bohaterowie Tenefyru");
  });

  it("pickBestPlanszeoHit dopasowuje polski tytuł do angielskiego sluga", () => {
    const hits = extractPlanszeoSearchHits(searchHtml);
    const best = pickBestPlanszeoHit("Bohaterowie Tenefyru", hits);
    assert.equal(best?.slug, "heroes-of-tenefyr");
  });

  it("stary pickBestPlanszeoSlug (tylko slug) nie łapie PL↔EN", () => {
    assert.equal(
      pickBestPlanszeoSlug("Bohaterowie Tenefyru", ["heroes-of-tenefyr", "bohaterowie-wykleci"]),
      null,
    );
  });
});
