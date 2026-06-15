import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSuggestQuery,
  SUGGEST_MAX_QUERY_LENGTH,
  SUGGEST_MIN_QUERY_LENGTH,
} from "./suggest-games";

describe("normalizeSuggestQuery", () => {
  it("obcina do maksymalnej długości", () => {
    const long = "a".repeat(SUGGEST_MAX_QUERY_LENGTH + 20);
    assert.equal(normalizeSuggestQuery(long).length, SUGGEST_MAX_QUERY_LENGTH);
  });

  it("trimuje białe znaki", () => {
    assert.equal(normalizeSuggestQuery("  abc  "), "abc");
  });

  it("minimum length dla suggest", () => {
    assert.equal(SUGGEST_MIN_QUERY_LENGTH, 2);
  });
});
