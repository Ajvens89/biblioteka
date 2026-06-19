import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Lokalna kopia logiki scoringu z fetchSimilarGames do testów jednostkowych. */
function scoreSimilarGame(params: {
  sharedCategories: number;
  samePublisher: boolean;
  sameDesigner: boolean;
  available: number;
  popularityCount: number;
}) {
  const score =
    params.sharedCategories * 3 +
    (params.samePublisher ? 2 : 0) +
    (params.sameDesigner ? 1 : 0) +
    (params.available > 0 ? 0.5 : 0);
  return { score, popularityCount: params.popularityCount };
}

describe("similar games scoring", () => {
  it("preferuje wspólne kategorie nad samą popularnością", () => {
    const withCategory = scoreSimilarGame({
      sharedCategories: 2,
      samePublisher: false,
      sameDesigner: false,
      available: 1,
      popularityCount: 10,
    });
    const popularOnly = scoreSimilarGame({
      sharedCategories: 0,
      samePublisher: false,
      sameDesigner: false,
      available: 0,
      popularityCount: 100,
    });
    assert.ok(withCategory.score > popularOnly.score);
  });

  it("dodaje bonus za wydawcę i projektanta", () => {
    const full = scoreSimilarGame({
      sharedCategories: 1,
      samePublisher: true,
      sameDesigner: true,
      available: 1,
      popularityCount: 5,
    });
    const minimal = scoreSimilarGame({
      sharedCategories: 1,
      samePublisher: false,
      sameDesigner: false,
      available: 0,
      popularityCount: 5,
    });
    assert.equal(full.score - minimal.score, 3.5);
  });
});
