import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreTitleMatch, isStrictTitleCoverMatch } from "./upcitemdb-provider";

describe("upcitemdb-provider", () => {
  it("scoreTitleMatch preferuje pełne dopasowanie", () => {
    assert.ok(scoreTitleMatch("Azul", "Plan B Azul Board Game") >= 75);
    assert.ok(scoreTitleMatch("5 sekund bez cenzury", "Gra 5 Sekund Bez Cenzury Trefl") >= 50);
  });

  it("scoreTitleMatch odrzuca zupełnie obce tytuły", () => {
    assert.ok(scoreTitleMatch("Azul", "Monopoly Classic") < 35);
  });

  it("isStrictTitleCoverMatch odrzuca złe Monopoly", () => {
    assert.equal(
      isStrictTitleCoverMatch("Monopoly Konie i kucyki", "Quiz Konie i kucyki Kapitan Nauka"),
      false,
    );
    assert.equal(
      isStrictTitleCoverMatch("Monopoly DC Universe", "Monopoly Singapore Edition"),
      false,
    );
    assert.equal(
      isStrictTitleCoverMatch("Monopoly Transformers", "Robo Rally Transformers"),
      false,
    );
    assert.ok(isStrictTitleCoverMatch("Monopoly Marvel Avengers", "Monopoly Marvel Avengers"));
  });
});
