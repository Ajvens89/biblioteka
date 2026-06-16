import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildHurtCatalog,
  canonicalHurtEan,
  findHurtProductByEan,
  findHurtProductByTitle,
  hurtEanLookupKeys,
  isCommercialHurtField,
  mapHurtProductToGameData,
  normalizeEan,
  normalizeHurtTitle,
  parseCsvRecords,
} from "./hurt-catalog";

const SAMPLE_CSV = `IDProduct,ProductName,Description,Price,Trade,VAT,InStock,EAN,Category,Publisher,FullDescription,MinAge,MinPlayingTime,MaxPlayingTime,MinPlayers,MaxPlayers,ImageURL,Thumbnail120x160,Language,ManufactuerInfo,SafetyWarning,ReleaseDate
100,"Gra Testowa","Krótki opis",99.99,50,23,10,0752830309388,"Gry planszowe",TestPub,"Pełny opis testowy",8,30,60,2,4,https://example.com/box.jpg,https://example.com/thumb.jpg,pl,Info producenta,Uwaga,2021
200,"Inna Gra","Opis",10,5,23,1,5907656600019,"Portal - RPG",Portal,"Opis RPG",12,,,1,6,https://example.com/rpg.jpg,,pl,,,`;

describe("hurt-catalog — EAN", () => {
  it("normalizeEan zachowuje cyfry jako tekst", () => {
    assert.equal(normalizeEan(" 0752830309388 "), "0752830309388");
  });

  it("hurtEanLookupKeys łączy 12 i 13 cyfr z zerem", () => {
    const keys = hurtEanLookupKeys("752830309388");
    assert.ok(keys.includes("752830309388"));
    assert.ok(keys.includes("0752830309388"));
  });

  it("canonicalHurtEan dodaje zero do EAN-12", () => {
    assert.equal(canonicalHurtEan("752830309388"), "0752830309388");
    assert.equal(canonicalHurtEan("0752830309388"), "0752830309388");
  });

  it("findHurtProductByEan dopasowuje oba warianty", () => {
    const catalog = buildHurtCatalog("test.csv", parseCsvRecords(SAMPLE_CSV));
    assert.equal(findHurtProductByEan("0752830309388", catalog)?.productName, "Gra Testowa");
    assert.equal(findHurtProductByEan("752830309388", catalog)?.productName, "Gra Testowa");
  });
});

describe("hurt-catalog — tytuł", () => {
  it("normalizeHurtTitle usuwa polskie znaki i interpunkcję", () => {
    assert.equal(normalizeHurtTitle("Azul: Edycja Polska!"), "azul edycja polska");
  });

  it("findHurtProductByTitle dopasowuje po tytule", () => {
    const catalog = buildHurtCatalog("test.csv", parseCsvRecords(SAMPLE_CSV));
    const hit = findHurtProductByTitle("Gra testowa", catalog);
    assert.ok(hit);
    assert.equal(hit?.product.productName, "Gra Testowa");
  });

  it("nie dopasowuje obcego tytułu", () => {
    const catalog = buildHurtCatalog("test.csv", parseCsvRecords(SAMPLE_CSV));
    assert.equal(findHurtProductByTitle("Zupełnie inna nazwa", catalog), null);
  });
});

describe("hurt-catalog — mapowanie", () => {
  it("mapHurtProductToGameData mapuje pola opisowe", () => {
    const catalog = buildHurtCatalog("test.csv", parseCsvRecords(SAMPLE_CSV));
    const product = catalog.products[0];
    const mapped = mapHurtProductToGameData(product);
    assert.equal(mapped.title, "Gra Testowa");
    assert.equal(mapped.shortDescription, "Krótki opis");
    assert.equal(mapped.description, "Pełny opis testowy");
    assert.equal(mapped.ean, "0752830309388");
    assert.equal(mapped.minAge, 8);
    assert.equal(mapped.minPlayTime, 30);
    assert.equal(mapped.maxPlayTime, 60);
    assert.equal(mapped.collectionType, "BOARD_GAME");
    assert.equal(mapped.yearPublished, 2021);
  });

  it("RPG z kategorii Portal", () => {
    const catalog = buildHurtCatalog("test.csv", parseCsvRecords(SAMPLE_CSV));
    const mapped = mapHurtProductToGameData(catalog.products[1]);
    assert.equal(mapped.collectionType, "RPG");
  });

  it("ISBN 978 + kategoria Różne → RPG", () => {
    const rows = parseCsvRecords(`IDProduct,ProductName,Description,EAN,Category,Publisher
300,"Wampir: Camarilla","Opis",9788397264588,"Różne",Alis`);
    const catalog = buildHurtCatalog("test.csv", rows);
    const mapped = mapHurtProductToGameData(catalog.products[0]);
    assert.equal(mapped.collectionType, "RPG");
  });
});

describe("hurt-catalog — pola handlowe", () => {
  it("ignoruje pola Price, Trade, VAT, InStock", () => {
    assert.equal(isCommercialHurtField("Price"), true);
    assert.equal(isCommercialHurtField("Trade"), true);
    assert.equal(isCommercialHurtField("VAT"), true);
    assert.equal(isCommercialHurtField("InStock"), true);
    assert.equal(isCommercialHurtField("ProductName"), false);
  });

  it("mapowanie nie zawiera cen", () => {
    const catalog = buildHurtCatalog("test.csv", parseCsvRecords(SAMPLE_CSV));
    const mapped = mapHurtProductToGameData(catalog.products[0]) as Record<string, unknown>;
    assert.equal("price" in mapped, false);
    assert.equal("trade" in mapped, false);
    assert.equal("inStock" in mapped, false);
  });
});

describe("hurt-catalog — puste pola", () => {
  it("parseCsvRecords nie wywala się na pustych polach", () => {
    const rows = parseCsvRecords("A,B\n1,");
    assert.equal(rows.length, 2);
    assert.equal(rows[1][1], "");
  });
});
