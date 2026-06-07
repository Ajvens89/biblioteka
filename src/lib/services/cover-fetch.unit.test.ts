import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getBggRequestHeaders, getBggToken, isBggConfigured } from "./ean-providers/bgg-auth";
import { gameNeedsCoverFetch } from "./cover-fetch";

describe("bgg-auth", () => {
  const prev = process.env.BGG_TOKEN;

  afterEach(() => {
    if (prev === undefined) delete process.env.BGG_TOKEN;
    else process.env.BGG_TOKEN = prev;
  });

  it("isBggConfigured gdy jest BGG_TOKEN", () => {
    process.env.BGG_TOKEN = "test-token";
    assert.equal(isBggConfigured(), true);
    assert.equal(getBggToken(), "test-token");
    assert.equal(getBggRequestHeaders().Authorization, "Bearer test-token");
  });

  it("bez tokenu brak Authorization", () => {
    delete process.env.BGG_TOKEN;
    assert.equal(isBggConfigured(), false);
    assert.equal(getBggRequestHeaders().Authorization, undefined);
  });
});

describe("cover-fetch — gameNeedsCoverFetch", () => {
  it("https wymaga pobrania na serwer", () => {
    assert.equal(gameNeedsCoverFetch("https://cf.geekdo-static.com/x.jpg"), true);
  });

  it("pusta wymaga pobrania", () => {
    assert.equal(gameNeedsCoverFetch(null), true);
    assert.equal(gameNeedsCoverFetch(""), true);
  });
});
